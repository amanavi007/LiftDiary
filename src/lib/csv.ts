export type CsvValue = string | number | boolean | null | undefined;

function field(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  // Stop spreadsheet apps from running user-typed text as a formula.
  if (typeof value === "string" && /^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsv(header: string[], rows: CsvValue[][]): string {
  return [header, ...rows].map((r) => r.map(field).join(",")).join("\r\n") + "\r\n";
}
