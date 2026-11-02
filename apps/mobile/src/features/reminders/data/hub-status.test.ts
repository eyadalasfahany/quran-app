import { azkarStatus, fridayStatus, misbahaStatus, reminderStatusKey } from './hub-status';

const ON_DHUHR = { enabled: true, mode: 'dhuhr' as const, clockTime: null };
const ON_CLOCK = { enabled: true, mode: 'clock' as const, clockTime: '07:00' };

describe('fridayStatus', () => {
  it('is off when the switch is off, whatever else is true', () => {
    expect(fridayStatus({ ...ON_DHUHR, enabled: false }, { granted: false, hasLocation: false })).toBe('off');
  });

  it('is permission denied when the system refused notifications', () => {
    expect(fridayStatus(ON_DHUHR, { granted: false, hasLocation: true })).toBe('permissionDenied');
  });

  it('needs a location in Dhuhr mode when none is known, and is scheduled once one is', () => {
    expect(fridayStatus(ON_DHUHR, { granted: true, hasLocation: false })).toBe('needsLocation');
    expect(fridayStatus(ON_DHUHR, { granted: true, hasLocation: true })).toBe('scheduled');
  });

  it('is scheduled in clock mode with a time, and needs a time without one', () => {
    expect(fridayStatus(ON_CLOCK, { granted: true, hasLocation: null })).toBe('scheduled');
    expect(fridayStatus({ ...ON_CLOCK, clockTime: null }, { granted: true, hasLocation: null })).toBe('needsTime');
  });

  it('treats a permission still being read as not refused', () => {
    expect(fridayStatus(ON_DHUHR, { granted: null, hasLocation: true })).toBe('scheduled');
  });
});

describe('misbahaStatus', () => {
  it('asks for a time until one is chosen, and never suggests one', () => {
    expect(misbahaStatus({ enabled: true, clockTime: null }, { granted: true })).toBe('needsTime');
    expect(misbahaStatus({ enabled: true, clockTime: '21:00' }, { granted: true })).toBe('scheduled');
  });

  it('is off, or permission denied, before any time', () => {
    expect(misbahaStatus({ enabled: false, clockTime: '21:00' }, { granted: true })).toBe('off');
    expect(misbahaStatus({ enabled: true, clockTime: null }, { granted: false })).toBe('permissionDenied');
  });
});

describe('azkarStatus', () => {
  const clock = { enabled: true, triggerType: 'clock' as const, clockTime: '06:30' };
  const prayer = { enabled: true, triggerType: 'prayer_relative' as const, clockTime: null };
  const base = { granted: true, unscheduled: false, hasLocation: true };

  it('is off with no reminder or a disabled one', () => {
    expect(azkarStatus(null, base)).toBe('off');
    expect(azkarStatus({ ...clock, enabled: false }, base)).toBe('off');
  });

  it('is budget full when the pending pool left it out', () => {
    expect(azkarStatus(clock, { ...base, unscheduled: true })).toBe('budgetFull');
  });

  it('is permission denied before the budget message', () => {
    expect(azkarStatus(clock, { ...base, granted: false, unscheduled: true })).toBe('permissionDenied');
  });

  it('needs a time for a clock reminder with none, and a location for a prayer-relative one', () => {
    expect(azkarStatus({ ...clock, clockTime: null }, base)).toBe('needsTime');
    expect(azkarStatus(prayer, { ...base, hasLocation: false })).toBe('needsLocation');
    expect(azkarStatus(prayer, base)).toBe('scheduled');
    expect(azkarStatus(clock, base)).toBe('scheduled');
  });
});

describe('reminderStatusKey', () => {
  it('maps each status to its interface string', () => {
    expect(reminderStatusKey('budgetFull')).toBe('reminders.status.budgetFull');
    expect(reminderStatusKey('off')).toBe('reminders.status.off');
  });
});
