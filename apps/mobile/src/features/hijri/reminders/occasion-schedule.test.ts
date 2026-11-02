import {
  HIJRI_REMINDER_OCCASION_IDS,
  nextOccasionFireDate,
  upcomingOccasionFireDates,
} from './occasion-schedule';

describe('occasion-schedule', () => {
  it('lists exactly the six annual occasions', () => {
    expect(HIJRI_REMINDER_OCCASION_IDS).toEqual([
      'muharram1',
      'muharram10',
      'ramadan1',
      'shawwal1',
      'dhulHijjah9',
      'dhulHijjah10',
    ]);
  });

  it('returns null when the clock time is missing or invalid', () => {
    const from = new Date(2026, 9, 31, 12);

    expect(nextOccasionFireDate('ramadan1', from, null, 0)).toBeNull();
    expect(nextOccasionFireDate('ramadan1', from, 'bad', 0)).toBeNull();
  });

  it('schedules 1 Ramadan 1448 at the chosen local time (Node ICU)', () => {
    const from = new Date(2027, 0, 1, 12);
    const fire = nextOccasionFireDate('ramadan1', from, '08:30', 0);

    expect(fire).not.toBeNull();
    expect(fire!.getFullYear()).toBe(2027);
    expect(fire!.getMonth()).toBe(1);
    expect(fire!.getDate()).toBe(8);
    expect(fire!.getHours()).toBe(8);
    expect(fire!.getMinutes()).toBe(30);
  });

  it('moves the fire date when the Hijri adjustment shifts the occasion', () => {
    const from = new Date(2027, 0, 1, 12);
    const base = nextOccasionFireDate('ramadan1', from, '09:00', 0);
    const shifted = nextOccasionFireDate('ramadan1', from, '09:00', 1);

    expect(base).not.toBeNull();
    expect(shifted).not.toBeNull();
    expect(Math.abs(shifted!.getTime() - base!.getTime())).toBe(86_400_000);
  });

  it('skips today when the fire time has already passed', () => {
    const from = new Date(2027, 1, 8, 10, 0, 0, 0);
    const fire = nextOccasionFireDate('ramadan1', from, '08:30', 0);

    expect(fire!.getTime()).toBeGreaterThan(from.getTime());
    expect(fire!.getFullYear()).toBeGreaterThanOrEqual(2027);
  });

  it('resolves each annual occasion in 1448 and 1449', () => {
    const from1448 = new Date(2026, 9, 1, 12);
    const from1449 = new Date(2027, 5, 1, 12);

    for (const id of HIJRI_REMINDER_OCCASION_IDS) {
      expect(nextOccasionFireDate(id, from1448, '07:00', 0)).not.toBeNull();
      expect(nextOccasionFireDate(id, from1449, '07:00', 0)).not.toBeNull();
    }
  });

  it('sorts enabled occasions by fire time', () => {
    const from = new Date(2026, 9, 31, 12);
    const rows = upcomingOccasionFireDates(['ramadan1', 'muharram1'], from, '06:00', 0);

    expect(rows.length).toBe(2);
    expect(rows[0]!.fireAt.getTime()).toBeLessThan(rows[1]!.fireAt.getTime());
  });
});
