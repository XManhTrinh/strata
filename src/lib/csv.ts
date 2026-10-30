/** CSV for spreadsheets: RFC 4180 quoting, CRLF line ends, and no formulas from cell text. */

// Text starting like a formula (=, +, -, @, tab, return) runs in Excel; a leading ' keeps it text.
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);
  const text = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function csvRow(values: (string | number | null | undefined)[]): string {
  return `${values.map(csvCell).join(",")}\r\n`;
}

/** Marks the file as UTF-8 so Excel shows accented names correctly. */
export const CSV_BOM = "﻿";
