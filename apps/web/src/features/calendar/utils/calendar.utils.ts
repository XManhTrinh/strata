/**
 * Color mapping for event types.
 * Maps event type names to Tailwind color classes.
 */
export const EVENT_TYPE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Leave: { bg: "bg-tertiary-container dark:bg-tertiary-container/30", text: "text-tertiary", border: "border-green-300 dark:border-green-700", dot: "bg-tertiary" },
  "Sick Leave": { bg: "bg-error-container dark:bg-error-container/30", text: "text-error", border: "border-error", dot: "bg-error" },
  Conference: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-800 dark:text-purple-300", border: "border-purple-300 dark:border-purple-700", dot: "bg-purple-500" },
  Training: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-800 dark:text-amber-300", border: "border-amber-300 dark:border-amber-700", dot: "bg-amber-500" },
  Meeting: { bg: "bg-primary-container dark:bg-primary-container/30", text: "text-primary", border: "border-primary", dot: "bg-primary" },
  "Out of Office": { bg: "bg-surface-container-low dark:bg-surface-container/50", text: "text-on-surface", border: "border-outline-variant", dot: "bg-surface-container-highest" },
  "Work From Home": { bg: "bg-cyan-100 dark:bg-cyan-900/30", text: "text-cyan-800 dark:text-cyan-300", border: "border-cyan-300 dark:border-cyan-700", dot: "bg-cyan-500" },
};

/**
 * Get color classes for a given event type name. Falls back to blue.
 */
export function getEventTypeColors(eventTypeName: string) {
  return EVENT_TYPE_COLORS[eventTypeName] ?? {
    bg: "bg-primary-container dark:bg-primary-container/30",
    text: "text-primary",
    border: "border-primary",
    dot: "bg-primary",
  };
}

/**
 * Format a date string as a short display string (e.g., "Dec 20").
 */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Format a date for display in a month header (e.g., "December 2024").
 */
export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * Get all days in a month, padded to fill a full calendar grid (Mon-Sun).
 * Returns an array of Date objects including leading/trailing days from adjacent months.
 */
export function getCalendarDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Monday = 0, ..., Sunday = 6 (ISO weekday)
  const startDayOfWeek = (firstDay.getDay() + 6) % 7; // convert Sun=0 to Mon=0
  const endDayOfWeek = (lastDay.getDay() + 6) % 7;

  const days: Date[] = [];

  // Leading days from previous month
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push(d);
  }

  // Days of current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  // Trailing days from next month
  const trailingDays = 6 - endDayOfWeek;
  for (let i = 1; i <= trailingDays; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

/**
 * Check if two dates are the same calendar day.
 */
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

/**
 * Check if a date falls between start and end (inclusive).
 */
export function isDateInRange(date: Date, startStr: string, endStr: string): boolean {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return d >= s && d <= e;
}

/**
 * Check if a given date is today.
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Calculate working days between two dates (excludes weekends).
 */
export function calculateWorkingDays(startStr: string, endStr: string): number {
  const start = new Date(startStr);
  const end = new Date(endStr);
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Get available balance from a balance record.
 */
export function getAvailableBalance(balance: { allocated: number; used: number; adjustment: number; carriedOver: number }): number {
  return balance.allocated + balance.carriedOver + balance.adjustment - balance.used;
}
