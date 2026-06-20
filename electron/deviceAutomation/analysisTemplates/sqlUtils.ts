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
