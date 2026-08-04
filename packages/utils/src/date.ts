/**
 * Format a date as YYYY-MM-DD (default) or with a custom format string.
 * Supported format tokens: YYYY, MM, DD, HH, mm, ss.
 */
export function formatDate(date: Date, format: string = "YYYY-MM-DD"): string {
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");

  return format
    .replace("YYYY", year)
    .replace("MM", month)
    .replace("DD", day)
    .replace("HH", hours)
    .replace("mm", minutes)
    .replace("ss", seconds);
}

/**
 * Format a date as ISO-style datetime string: YYYY-MM-DD HH:mm:ss.
 */
export function formatDateTime(date: Date): string {
  return formatDate(date, "YYYY-MM-DD HH:mm:ss");
}

/**
 * Check if a string is a valid ISO 8601 date string.
 */
export function isValidISODate(str: string): boolean {
  const date = new Date(str);
  return !isNaN(date.getTime()) && str === date.toISOString().split("T")[0]
    ? true
    : !isNaN(date.getTime()) && date.toISOString() === str;
}

/**
 * Parse an ISO date string into a Date object.
 * Returns null if the string is not a valid date.
 */
export function parseISODate(str: string): Date | null {
  const date = new Date(str);
  if (isNaN(date.getTime())) {
    return null;
  }
  return date;
}
