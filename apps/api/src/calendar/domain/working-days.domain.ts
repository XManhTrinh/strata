/**
 * Calculates the number of working days (weekdays: Mon-Fri) in the date range
 * [startDate, endDate), i.e., inclusive of start, exclusive of end.
 *
 * If startDate >= endDate, returns 0.
 */
export function calculateWorkingDays(startDate: Date, endDate: Date): number {
  if (startDate >= endDate) {
    return 0;
  }

  let count = 0;
  const current = new Date(startDate);
  // Normalize to midnight to avoid time-based issues
  current.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current < end) {
    const dayOfWeek = current.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}
