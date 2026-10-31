import { storage, storageKeys } from '../../../core/storage/mmkv';
import { getBellEnabled, setBellEnabled } from './bells';

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
});
