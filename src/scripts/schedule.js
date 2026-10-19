import { getActualPickupDate } from './lib/holiday-logic.js';

const DAY_ABBR_TO_DOW = { MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 0 };

/**
 * Returns the ISO date string for the canonical scheduled pickup day in the
 * same ISO week as the given date.
 *
 * @param {string} date - ISO date string
 * @param {string} dayAbbr - e.g. "TUE"
 * @returns {string} ISO date string of that day in the same week
 */
function scheduledDayInWeek(date, dayAbbr) {
  const d = new Date(date + 'T00:00:00Z');
  const currentDow = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  const targetDow = (DAY_ABBR_TO_DOW[dayAbbr] + 6) % 7;
  const delta = targetDow - currentDow;
  const result = new Date(d);
  result.setUTCDate(d.getUTCDate() + delta);
  return result.toISOString().slice(0, 10);
}

/**
 * Returns the next actual pickup date strictly after `fromDate`.
 * Steps forward one canonical week at a time until a non-"skip" result.
 */
function nextPickupAfter(fromDate, dayAbbr, holidays, overrides) {
  // Start from the canonical scheduled day in the current week
  let scheduled = scheduledDayInWeek(fromDate, dayAbbr);
  // Must be strictly after fromDate
  if (scheduled <= fromDate) {
    const d = new Date(scheduled + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + 7);
    scheduled = d.toISOString().slice(0, 10);
  }
  for (let i = 0; i < 52; i++) {
    const actual = getActualPickupDate(scheduled, holidays, overrides);
    if (actual !== 'skip') return actual;
    const d = new Date(scheduled + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + 7);
    scheduled = d.toISOString().slice(0, 10);
  }
  return null;
}

/**
 * Determines today's pickup status for a given zone.
 *
 * @param {object} zone - { zoneId, trashDay, secondTrashDay }
 * @param {string} date - today's ISO date string
 * @param {string[]} holidays - all city-observed holiday ISO dates
 * @param {Record<string, string|"skip">} overrides - manual date overrides
 * @returns {object} PickupStatus
 */
export function getPickupStatus(zone, date, holidays, overrides) {
  // Primary day
  const primaryScheduled = scheduledDayInWeek(date, zone.trashDay);
  const primaryActual = getActualPickupDate(primaryScheduled, holidays, overrides);
  const isTrashDay = primaryActual === date;
  const isRecyclingDay = isTrashDay;

  // Secondary day (pilot zones only)
  let isSecondTrashDay = false;
  if (zone.secondTrashDay) {
    const secondScheduled = scheduledDayInWeek(date, zone.secondTrashDay);
    const secondActual = getActualPickupDate(secondScheduled, holidays, overrides);
    isSecondTrashDay = secondActual === date && !isTrashDay;
  }

  const nextTrashDate = nextPickupAfter(date, zone.trashDay, holidays, overrides);
  const nextSecondTrashDate = zone.secondTrashDay
    ? nextPickupAfter(date, zone.secondTrashDay, holidays, overrides)
    : null;

  return { isTrashDay, isRecyclingDay, isSecondTrashDay, nextTrashDate, nextSecondTrashDate };
}
