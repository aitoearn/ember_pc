export function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

/** Perfetto SQL GLOB 包名过滤（`com.example*`） */
export function packageGlob(packageName: string): string {
  const trimmed = packageName.trim();
  if (!trimmed) {
    return "*";
  }
  return escapeSqlLiteral(`${trimmed}*`);
}

export async function runSqlSafe(
  runSql: (sql: string) => Promise<Record<string, string | number | null>[]>,
  sql: string,
): Promise<Record<string, string | number | null>[]> {
  try {
    return await runSql(sql);
  } catch {
    return [];
  }
}

export function rowsToRecords(
  columns: string[],
  rows: unknown[][],
): Record<string, string | number | null>[] {
  return rows.map((row) => {
    const record: Record<string, string | number | null> = {};
    columns.forEach((column, index) => {
      const value = row[index];
      if (value == null) {
        record[column] = null;
        return;
      }
      if (typeof value === "number" || typeof value === "string") {
        record[column] = value;
        return;
      }
      if (typeof value === "boolean") {
        record[column] = value ? 1 : 0;
        return;
      }
      record[column] = String(value);
    });
    return record;
  });
}
