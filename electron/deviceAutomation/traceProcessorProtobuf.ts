/**
 * trace_processor HTTP API 的 protobuf 编解码。
 * 逻辑对齐 SmartPerfetto backend/src/services/traceProcessorProtobuf.ts。
 */

export function encodeVarint(value: number): Buffer {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`无效的 varint 值: ${value}`);
  }

  const result: number[] = [];
  let current = value;
  while (current > 127) {
    result.push((current % 128) | 0x80);
    current = Math.floor(current / 128);
  }
  result.push(current);
  return Buffer.from(result);
}

function decodeVarint(buf: Buffer, offset: number): [number, number] {
  const [value, bytesRead] = decodeUnsignedVarintBigInt(buf, offset);
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("varint 超出 JavaScript 安全整数范围");
  }
  return [Number(value), bytesRead];
}

function decodeUnsignedVarintBigInt(buf: Buffer, offset: number): [bigint, number] {
  let value = 0n;
  let shift = 0n;
  let bytesRead = 0;

  while (offset + bytesRead < buf.length) {
    const byte = buf[offset + bytesRead];
    bytesRead += 1;
    value |= BigInt(byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) {
      return [value, bytesRead];
    }
    shift += 7n;
    if (bytesRead >= 10) {
      throw new Error("varint 过长");
    }
  }

  throw new Error("varint 被截断");
}

function decodeInt64Varint(buf: Buffer, offset: number): [number, number] {
  const [raw, bytesRead] = decodeUnsignedVarintBigInt(buf, offset);
  const signed = raw >= (1n << 63n) ? raw - (1n << 64n) : raw;
  return [Number(signed), bytesRead];
}

function encodeStringField(fieldNum: number, str: string): Buffer {
  const strBuf = Buffer.from(str, "utf8");
  const tag = (fieldNum << 3) | 2;
  return Buffer.concat([Buffer.from([tag]), encodeVarint(strBuf.length), strBuf]);
}

function encodeBytesField(fieldNum: number, bytes: Buffer): Buffer {
  const tag = (fieldNum << 3) | 2;
  return Buffer.concat([Buffer.from([tag]), encodeVarint(bytes.length), bytes]);
}

function encodeVarintField(fieldNum: number, value: number): Buffer {
  const tag = (fieldNum << 3) | 0;
  return Buffer.concat([Buffer.from([tag]), encodeVarint(value)]);
}

function encodePackedVarintField(fieldNum: number, values: number[]): Buffer {
  const packed = Buffer.concat(values.map(encodeVarint));
  return encodeBytesField(fieldNum, packed);
}

function encodeSignedInt64Varint(value: number): Buffer {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`无效的 int64 varint 值: ${value}`);
  }
  let raw = BigInt(value);
  if (raw < 0n) {
    raw += 1n << 64n;
  }
  const result: number[] = [];
  while (raw > 127n) {
    result.push(Number((raw & 0x7fn) | 0x80n));
    raw >>= 7n;
  }
  result.push(Number(raw));
  return Buffer.from(result);
}

function encodePackedSignedInt64Field(fieldNum: number, values: number[]): Buffer {
  const packed = Buffer.concat(values.map(encodeSignedInt64Varint));
  return encodeBytesField(fieldNum, packed);
}

function encodePackedDoubleField(fieldNum: number, values: number[]): Buffer {
  const packed = Buffer.alloc(values.length * 8);
  values.forEach((value, index) => packed.writeDoubleLE(value, index * 8));
  return encodeBytesField(fieldNum, packed);
}

export function encodeQueryArgs(sql: string): Buffer {
  return encodeStringField(1, sql);
}

enum CellType {
  CELL_INVALID = 0,
  CELL_NULL = 1,
  CELL_VARINT = 2,
  CELL_FLOAT64 = 3,
  CELL_STRING = 4,
  CELL_BLOB = 5,
}

export interface ParsedQueryResult {
  columnNames: string[];
  rows: unknown[][];
  error?: string;
}

function assertLengthDelimitedRange(buf: Buffer, offset: number, length: number): void {
  if (!Number.isSafeInteger(length) || length < 0 || offset + length > buf.length) {
    throw new Error("无效的 length-delimited 字段长度");
  }
}

function skipUnknownField(buf: Buffer, offset: number, wireType: number): number {
  switch (wireType) {
    case 0: {
      const [, bytesRead] = decodeVarint(buf, offset);
      return offset + bytesRead;
    }
    case 1:
      if (offset + 8 > buf.length) {
        throw new Error("fixed64 字段被截断");
      }
      return offset + 8;
    case 2: {
      const [len, bytesRead] = decodeVarint(buf, offset);
      offset += bytesRead;
      assertLengthDelimitedRange(buf, offset, len);
      return offset + len;
    }
    case 5:
      if (offset + 4 > buf.length) {
        throw new Error("fixed32 字段被截断");
      }
      return offset + 4;
    default:
      throw new Error(`不支持的 protobuf wire type: ${wireType}`);
  }
}

function parsePackedVarints(
  buf: Buffer,
  offset: number,
  length: number,
  decoder: (buffer: Buffer, start: number) => [number, number] = decodeVarint,
): number[] {
  const result: number[] = [];
  const end = offset + length;
  if (length < 0 || end > buf.length) {
    throw new Error("packed varint 长度无效");
  }
  while (offset < end) {
    const [value, bytesRead] = decoder(buf, offset);
    result.push(value);
    offset += bytesRead;
  }
  return result;
}

function parsePackedDoubles(buf: Buffer, offset: number, length: number): number[] {
  const result: number[] = [];
  const end = offset + length;
  if (length < 0 || end > buf.length || length % 8 !== 0) {
    throw new Error("packed double 长度无效");
  }
  while (offset < end) {
    result.push(buf.readDoubleLE(offset));
    offset += 8;
  }
  return result;
}

function parseCellsBatch(buf: Buffer, offset: number, length: number) {
  const end = offset + length;
  let cells: CellType[] = [];
  let varintCells: number[] = [];
  let float64Cells: number[] = [];
  let stringCellsRaw = "";
  const blobCells: Buffer[] = [];

  while (offset < end) {
    const tag = buf[offset];
    offset += 1;
    const fieldNum = tag >> 3;
    const wireType = tag & 0x07;

    if (wireType === 2) {
      const [len, bytesRead] = decodeVarint(buf, offset);
      offset += bytesRead;
      assertLengthDelimitedRange(buf, offset, len);

      if (fieldNum === 1) {
        cells = parsePackedVarints(buf, offset, len).map((value) => value as CellType);
      } else if (fieldNum === 2) {
        varintCells = parsePackedVarints(buf, offset, len, decodeInt64Varint);
      } else if (fieldNum === 3) {
        float64Cells = parsePackedDoubles(buf, offset, len);
      } else if (fieldNum === 4) {
        blobCells.push(buf.subarray(offset, offset + len));
      } else if (fieldNum === 5) {
        stringCellsRaw = buf.subarray(offset, offset + len).toString("utf8");
      }
      offset += len;
    } else {
      offset = skipUnknownField(buf, offset, wireType);
    }
  }

  const stringCells = stringCellsRaw ? stringCellsRaw.split("\0").slice(0, -1) : [];
  return { cells, varintCells, float64Cells, stringCells, blobCells };
}

export function decodeQueryResult(buf: Buffer): ParsedQueryResult {
  const columnNames: string[] = [];
  let error: string | undefined;
  const batches: ReturnType<typeof parseCellsBatch>[] = [];

  let offset = 0;
  while (offset < buf.length) {
    const tag = buf[offset];
    offset += 1;
    const fieldNum = tag >> 3;
    const wireType = tag & 0x07;

    if (wireType === 2) {
      const [len, bytesRead] = decodeVarint(buf, offset);
      offset += bytesRead;
      assertLengthDelimitedRange(buf, offset, len);

      if (fieldNum === 1) {
        columnNames.push(buf.subarray(offset, offset + len).toString("utf8"));
      } else if (fieldNum === 2) {
        error = buf.subarray(offset, offset + len).toString("utf8");
      } else if (fieldNum === 3) {
        batches.push(parseCellsBatch(buf, offset, len));
      }
      offset += len;
    } else {
      offset = skipUnknownField(buf, offset, wireType);
    }
  }

  const rows: unknown[][] = [];
  const numColumns = columnNames.length;
  if (numColumns > 0) {
    for (const batch of batches) {
      let varintIdx = 0;
      let float64Idx = 0;
      let stringIdx = 0;
      let blobIdx = 0;
      let currentRow: unknown[] = [];
      let colIdx = 0;

      for (const cellType of batch.cells) {
        let value: unknown = null;
        switch (cellType) {
          case CellType.CELL_NULL:
            value = null;
            break;
          case CellType.CELL_VARINT:
            value = batch.varintCells[varintIdx] ?? null;
            varintIdx += 1;
            break;
          case CellType.CELL_FLOAT64:
            value = batch.float64Cells[float64Idx] ?? null;
            float64Idx += 1;
            break;
          case CellType.CELL_STRING:
            value = batch.stringCells[stringIdx] ?? null;
            stringIdx += 1;
            break;
          case CellType.CELL_BLOB:
            value = batch.blobCells[blobIdx] ?? null;
            blobIdx += 1;
            break;
          default:
            value = null;
        }

        currentRow.push(value);
        colIdx += 1;
        if (colIdx >= numColumns) {
          rows.push(currentRow);
          currentRow = [];
          colIdx = 0;
        }
      }

      if (currentRow.length > 0) {
        while (currentRow.length < numColumns) {
          currentRow.push(null);
        }
        rows.push(currentRow);
      }
    }
  }

  return { columnNames, rows, error };
}
