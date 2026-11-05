import { storage, storageKeys } from '../../../core/storage/mmkv';
import { getBellEnabled, isBellUnset, setBellEnabled } from './bells';

describe('salah bells', () => {
  beforeEach(() => {
    for (const key of [
      storageKeys.salah.bellFajr,
      storageKeys.salah.bellDhuhr,
      storageKeys.salah.bellAsr,
      storageKeys.salah.bellMaghrib,
      storageKeys.salah.bellIsha,
    ]) {
      storage.remove(key);
    }
  });

  it('defaults every prayer bell to off', () => {
    expect(getBellEnabled('fajr')).toBe(false);
    expect(getBellEnabled('dhuhr')).toBe(false);
    expect(getBellEnabled('asr')).toBe(false);
    expect(getBellEnabled('maghrib')).toBe(false);
    expect(getBellEnabled('isha')).toBe(false);
  });

  it('persists a toggle per prayer', () => {
    setBellEnabled('maghrib', true);

    expect(getBellEnabled('maghrib')).toBe(true);
    expect(getBellEnabled('isha')).toBe(false);
  });

  it('turns a bell back off', () => {
    setBellEnabled('fajr', true);
    setBellEnabled('fajr', false);

    expect(getBellEnabled('fajr')).toBe(false);
  });

  it('reads a bell the user has never set as unset', () => {
    expect(isBellUnset('isha')).toBe(true);
  });

  it('reads a bell turned on as set', () => {
    setBellEnabled('isha', true);

    expect(isBellUnset('isha')).toBe(false);
  });

  it('reads an explicit off as set, so it is never overwritten', () => {
    setBellEnabled('isha', false);

    expect(isBellUnset('isha')).toBe(false);
    expect(getBellEnabled('isha')).toBe(false);
  });
});
