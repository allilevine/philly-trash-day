import { describe, it, expect } from 'vitest';
import { generateZoneIcal } from '../scripts/lib/ical-generator.js';

const zone = { zoneId: 'tue', trashDay: 'TUE', secondTrashDay: null };
const pilotZone = { zoneId: 'tue-fri', trashDay: 'TUE', secondTrashDay: 'FRI' };
const start = new Date('2026-01-01');
const end = new Date('2026-02-01');

describe('generateZoneIcal', () => {
  it('returns string beginning with BEGIN:VCALENDAR', () => {
    expect(generateZoneIcal(zone, [], {}, start, end)).toMatch(/^BEGIN:VCALENDAR/);
  });
  it('returns string ending with END:VCALENDAR', () => {
    expect(generateZoneIcal(zone, [], {}, start, end).trim()).toMatch(/END:VCALENDAR$/);
  });
  it('includes trash & recycling event on each Tuesday in window', () => {
    const ics = generateZoneIcal(zone, [], {}, start, end);
    expect(ics).toContain('20260106');
    expect(ics).toContain('20260113');
  });
  it('includes "Trash & Recycling" summary on primary day', () => {
    expect(generateZoneIcal(zone, [], {}, start, end)).toMatch(/SUMMARY:Trash & Recycling/i);
  });
  it('pilot zone includes second trash-only event on Friday', () => {
    const ics = generateZoneIcal(pilotZone, [], {}, start, end);
    expect(ics).toMatch(/SUMMARY:Trash only/i);
    expect(ics).toContain('20260109'); // Fri Jan 9
  });
  it('pilot zone second-trash event does NOT include recycling summary', () => {
    const ics = generateZoneIcal(pilotZone, [], {}, start, end);
    const trashOnlyCount = (ics.match(/SUMMARY:Trash only/ig) || []).length;
    expect(trashOnlyCount).toBeGreaterThan(0);
  });
  it('applies holiday shift to primary day', () => {
    // MLK Day Jan 19 (Mon) → Tue Jan 20 shifts to Wed Jan 21
    const ics = generateZoneIcal(zone, ['2026-01-19'], {}, start, new Date('2026-01-31'));
    expect(ics).toContain('20260121');
  });
});
