// Prevent spreadsheet formula execution when opening exported user-entered cells.
export function csvCell(value: unknown): string {
  let s = Array.isArray(value)
    ? value.join(" | ")
    : value === null || value === undefined
      ? ""
      : String(value);
  if (/^[\s]*[=+@-]/.test(s) && typeof value !== "number") s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export function makeCsv(rows: unknown[][]): string {
  return "\ufeff" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
