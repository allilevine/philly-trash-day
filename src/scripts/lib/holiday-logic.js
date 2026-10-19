/**
 * Returns the ISO week number (Mon=1 through Sun=7) for a date string.
 * Uses ISO week: week starts Monday.
 */
function isoWeekKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  // Shift so Monday=0
  const day = (d.getUTCDay() + 6) % 7;
  const thursday = new Date(d);
  thursday.setUTCDate(d.getUTCDate() - day + 3);
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const week = Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7);
  return `${thursday.getUTCFullYear()}-W${week}`;
}

/**
 * Returns the ISO day-of-week index for a date string.
 * Monday = 0, Tuesday = 1, ..., Sunday = 6
 */
function isoDow(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  return (d.getUTCDay() + 6) % 7;
}

/**
 * Shifts an ISO date string forward by `days` calendar days.
 */
function shiftDate(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Returns the actual pickup date after applying Philadelphia's holiday delay rule.
 *
 * Rule: for each city-observed holiday falling Mon–Fri in the same ISO week as
 * scheduledDate that falls on or before scheduledDate in that week, shift
 * scheduledDate forward by 1 day.
 *
 * overrides take precedence over the computed shift.
 *
 * @param {string} scheduledDate - ISO date of the normally-scheduled collection
 * @param {string[]} holidays - all city-observed holiday ISO dates
 * @param {Record<string, string|"skip">} overrides - manual date overrides
 * @returns {string} actual pickup date, or "skip" if cancelled
 */
export function getActualPickupDate(scheduledDate, holidays, overrides) {
  if (overrides[scheduledDate] !== undefined) {
    return overrides[scheduledDate];
  }

  const week = isoWeekKey(scheduledDate);
  const scheduledDow = isoDow(scheduledDate);

  let shift = 0;
  for (const holiday of holidays) {
    const hDow = isoDow(holiday);
    // Count Mon–Fri holidays (dow 0–4) in same week, on or before scheduledDate
    if (isoWeekKey(holiday) === week && hDow <= 4 && hDow <= scheduledDow) {
      shift++;
    }
  }

  return shift === 0 ? scheduledDate : shiftDate(scheduledDate, shift);
}
