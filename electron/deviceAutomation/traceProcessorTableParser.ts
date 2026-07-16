import type { TraceQueryRow } from "./traceProcessorRunner";

/** 解析 trace_processor `-Q` / `query` 的 CSV 表格行（支持引号字段与无引号数字） */
export function parseCsvRow(line: string): string[] {
  const cells: string[] = [];
  let index = 0;
  while (index < line.length) {
    if (line[index] === ",") {
      index += 1;
      continue;
    }
    if (line[index] === '"') {
      index += 1;
      let value = "";
      while (index < line.length) {
        if (line[index] === '"' && line[index + 1] === '"') {
          value += '"';
          index += 2;
          continue;
        }
        if (line[index] === '"') {
          index += 1;
          break;
        }
        value += line[index];
        index += 1;
      }
      cells.push(value);
      if (line[index] === ",") {
        index += 1;
      }
      continue;
    }
    const commaIndex = line.indexOf(",", index);
    const end = commaIndex === -1 ? line.length : commaIndex;
    cells.push(line.slice(index, end).trim());
    index = commaIndex === -1 ? line.length : commaIndex + 1;
  }
  return cells;
}

function isTableDataLine(line: string): boolean {
  if (line.startsWith('"')) {
    return true;
  }
  return /^-?\d/.test(line);
}

function isTableHeaderLine(line: string): boolean {
  if (!line.startsWith('"')) {
    return false;
  }
  if (line.includes(",")) {
    return true;
  }
  const nextIndex = 0;
  return line.match(/^"[^"]+"$/) !== null;
}

function cellToValue(raw: string): string | number | null {
  if (raw === "") {
    return null;
  }
  const asNumber = Number(raw);
  if (Number.isFinite(asNumber) && raw.trim() !== "") {
    return asNumber;
  }
  return raw;
}

/**
 * 解析 trace_processor 查询 stdout。
 * 噪声（Loading trace、Trace health issues 等）在 stderr，stdout 为 CSV 表。
 */
export function parseTraceProcessorTableOutput(stdout: string): TraceQueryRow[] {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let headerIndex = -1;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (!isTableHeaderLine(line)) {
      continue;
    }
    const nextLine = lines[index + 1];
    if (nextLine && isTableDataLine(nextLine)) {
      headerIndex = index;
      break;
    }
  }

  if (headerIndex < 0) {
    return [];
  }

  const header = parseCsvRow(lines[headerIndex]!);
  if (header.length === 0) {
    return [];
  }

  const rows: TraceQueryRow[] = [];
  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (!isTableDataLine(line)) {
      break;
    }
    const cells = parseCsvRow(line);
    if (cells.length === 0) {
      continue;
    }
    const row: TraceQueryRow = {};
    header.forEach((key, cellIndex) => {
      const raw = cells[cellIndex];
      row[key] = raw === undefined ? null : cellToValue(raw);
    });
    rows.push(row);
  }

  return rows;
}
