import ical from 'ical-generator';
import { getActualPickupDate } from '../../src/scripts/lib/holiday-logic.js';

const DAY_ABBR_TO_DOW = { MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 0 };

/**
 * Returns an array of ISO date strings for every occurrence of the given
 * day-of-week abbreviation between windowStart (inclusive) and windowEnd (exclusive).
 */
function enumerateDays(dayAbbr, windowStart, windowEnd) {
  const targetDow = DAY_ABBR_TO_DOW[dayAbbr];
  const dates = [];
  const cursor = new Date(windowStart);
  cursor.setUTCHours(0, 0, 0, 0);
  // Advance to first occurrence of targetDow
  while (cursor.getUTCDay() !== targetDow) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  while (cursor < windowEnd) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  return dates;
}

/**
 * Generates a complete .ics file for a given collection zone.
 *
 * @param {object} zone - { zoneId, trashDay, secondTrashDay }
 * @param {string[]} holidays - ISO date strings of city-observed holidays
 * @param {Record<string, string|"skip">} overrides - manual date overrides
 * @param {Date} windowStart - start of generation window (inclusive)
 * @param {Date} windowEnd - end of generation window (exclusive)
 * @returns {string} complete .ics file content
 */
export function generateZoneIcal(zone, holidays, overrides, windowStart, windowEnd) {
  const cal = ical({
    name: `Philadelphia Trash Day — Zone ${zone.zoneId.toUpperCase()}`,
  });

  for (const scheduledDate of enumerateDays(zone.trashDay, windowStart, windowEnd)) {
    const actual = getActualPickupDate(scheduledDate, holidays, overrides);
    if (actual === 'skip') continue;
    cal.createEvent({
      start: new Date(actual + 'T00:00:00Z'),
      allDay: true,
      summary: 'Trash & Recycling',
      description: 'Put out your trash and recycling bins.',
    });
  }

  if (zone.secondTrashDay) {
    for (const scheduledDate of enumerateDays(zone.secondTrashDay, windowStart, windowEnd)) {
      const actual = getActualPickupDate(scheduledDate, holidays, overrides);
      if (actual === 'skip') continue;
      cal.createEvent({
        start: new Date(actual + 'T00:00:00Z'),
        allDay: true,
        summary: 'Trash only (no recycling)',
        description: 'Put out your trash bins. No recycling today.',
      });
    }
  }

  return cal.toString();
}
