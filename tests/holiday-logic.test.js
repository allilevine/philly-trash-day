import { describe, it, expect } from 'vitest';
import { getActualPickupDate } from '../src/scripts/lib/holiday-logic.js';

describe('getActualPickupDate', () => {
  it('returns scheduled date when no holidays', () => {
    expect(getActualPickupDate('2026-03-10', [], {})).toBe('2026-03-10');
  });
  it('shifts Monday route by 1 when Monday is a holiday', () => {
    expect(getActualPickupDate('2026-01-19', ['2026-01-19'], {})).toBe('2026-01-20');
  });
  it('shifts Tuesday route by 1 when Monday is a holiday', () => {
    expect(getActualPickupDate('2026-01-20', ['2026-01-19'], {})).toBe('2026-01-21');
  });
  it('does not shift Wednesday route when Friday is a holiday', () => {
    expect(getActualPickupDate('2026-07-01', ['2026-07-03'], {})).toBe('2026-07-01');
  });
  it('shifts by 2 when two holidays fall earlier in the same week', () => {
    // Mon Jan 5 + Tue Jan 6 holidays → Wed Jan 7 shifts to Fri Jan 9
    expect(getActualPickupDate('2026-01-07', ['2026-01-05', '2026-01-06'], {})).toBe('2026-01-09');
  });
  it('returns override value when override exists', () => {
    expect(getActualPickupDate('2026-11-27', [], { '2026-11-27': '2026-11-28' })).toBe('2026-11-28');
  });
  it('returns "skip" when override is "skip"', () => {
    expect(getActualPickupDate('2026-12-25', [], { '2026-12-25': 'skip' })).toBe('skip');
  });
  it('override takes precedence over computed shift', () => {
    expect(getActualPickupDate('2026-01-19', ['2026-01-19'], { '2026-01-19': '2026-01-22' })).toBe('2026-01-22');
  });
});
