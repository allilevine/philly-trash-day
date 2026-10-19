import { describe, it, expect } from 'vitest';
import { getPickupStatus } from '../src/scripts/schedule.js';

const zone = { zoneId: 'tue', trashDay: 'TUE', secondTrashDay: null };
const pilotZone = { zoneId: 'tue-fri', trashDay: 'TUE', secondTrashDay: 'FRI' };

describe('getPickupStatus', () => {
  it('isTrashDay true on unshifted trash day', () => {
    expect(getPickupStatus(zone, '2026-01-06', [], {}).isTrashDay).toBe(true);
  });
  it('isTrashDay false on a non-trash day', () => {
    expect(getPickupStatus(zone, '2026-01-07', [], {}).isTrashDay).toBe(false);
  });
  it('isRecyclingDay equals isTrashDay', () => {
    const s = getPickupStatus(zone, '2026-01-06', [], {});
    expect(s.isRecyclingDay).toBe(s.isTrashDay);
  });
  it('isSecondTrashDay false for non-pilot zone', () => {
    expect(getPickupStatus(zone, '2026-01-09', [], {}).isSecondTrashDay).toBe(false);
  });
  it('isSecondTrashDay true on secondTrashDay for pilot zone', () => {
    expect(getPickupStatus(pilotZone, '2026-01-09', [], {}).isSecondTrashDay).toBe(true);
  });
  it('isRecyclingDay false on secondTrashDay for pilot zone', () => {
    expect(getPickupStatus(pilotZone, '2026-01-09', [], {}).isRecyclingDay).toBe(false);
  });
  it('isTrashDay false when that date is skipped via override', () => {
    expect(getPickupStatus(zone, '2026-01-06', [], { '2026-01-06': 'skip' }).isTrashDay).toBe(false);
  });
  it('isTrashDay true on a shifted date', () => {
    // MLK Day Jan 19 (Mon) → Tue Jan 20 shifts to Wed Jan 21
    expect(getPickupStatus(zone, '2026-01-21', ['2026-01-19'], {}).isTrashDay).toBe(true);
  });
  it('nextTrashDate is one week later when today is trash day', () => {
    expect(getPickupStatus(zone, '2026-01-06', [], {}).nextTrashDate).toBe('2026-01-13');
  });
  it('nextTrashDate skips a week when that week is overridden to skip', () => {
    expect(getPickupStatus(zone, '2026-01-06', [], { '2026-01-13': 'skip' }).nextTrashDate).toBe('2026-01-20');
  });
  it('nextSecondTrashDate is null for non-pilot zone', () => {
    expect(getPickupStatus(zone, '2026-01-06', [], {}).nextSecondTrashDate).toBeNull();
  });
});
