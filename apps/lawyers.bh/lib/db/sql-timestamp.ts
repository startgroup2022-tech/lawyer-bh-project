export function toSqlTimestamp(value: Date): string {
  return value.toISOString();
}
