import { storage, storageKeys } from '@/core/storage/mmkv';

import {
  NO_FRIDAY_REMINDER,
  NO_MISBAHA_REMINDER,
  readFridayReminder,
  readMisbahaReminder,
  writeFridayReminder,
  writeMisbahaReminder,
} from './goal-settings';

describe('goal reminder settings', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('is off, in Dhuhr mode, with no time, when nothing is stored', () => {
    expect(readFridayReminder()).toEqual(NO_FRIDAY_REMINDER);
    expect(readMisbahaReminder()).toEqual(NO_MISBAHA_REMINDER);
  });

  it('round-trips the Friday reminder', () => {
    writeFridayReminder({ enabled: true, mode: 'clock', clockTime: '07:05' });

    expect(readFridayReminder()).toEqual({ enabled: true, mode: 'clock', clockTime: '07:05' });
  });

  it('round-trips the misbaha reminder', () => {
    writeMisbahaReminder({ enabled: true, clockTime: '21:30' });

    expect(readMisbahaReminder()).toEqual({ enabled: true, clockTime: '21:30' });
  });

  it('drops a malformed clock time and an unknown mode, and keeps the switch', () => {
    storage.set(storageKeys.reminders.friday, JSON.stringify({ enabled: true, mode: 'weekly', clockTime: '25:99' }));

    expect(readFridayReminder()).toEqual({ enabled: true, mode: 'dhuhr', clockTime: null });
  });

  it('treats anything other than true as off', () => {
    storage.set(storageKeys.reminders.misbaha, JSON.stringify({ enabled: 'yes', clockTime: '06:00' }));

    expect(readMisbahaReminder()).toEqual({ enabled: false, clockTime: '06:00' });
  });

  it('falls back to the default for corrupt JSON', () => {
    storage.set(storageKeys.reminders.friday, '{not json');
    storage.set(storageKeys.reminders.misbaha, '"a string"');

    expect(readFridayReminder()).toEqual(NO_FRIDAY_REMINDER);
    expect(readMisbahaReminder()).toEqual(NO_MISBAHA_REMINDER);
  });
});
