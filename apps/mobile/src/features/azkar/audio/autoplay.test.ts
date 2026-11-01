import { storage, storageKeys } from '@/core/storage/mmkv';

import { readAzkarAutoplay, saveAzkarAutoplay } from './autoplay';

describe('azkar autoplay preference', () => {
  afterEach(() => {
    storage.remove(storageKeys.azkar.audioAutoplay);
  });

  it('is off until it is saved', () => {
    expect(readAzkarAutoplay()).toBe(false);
  });

  it('saves and reads the value back', () => {
    expect(saveAzkarAutoplay(true)).toBe(true);
    expect(readAzkarAutoplay()).toBe(true);
    saveAzkarAutoplay(false);
    expect(readAzkarAutoplay()).toBe(false);
  });

  it('stores it under the Azkar key', () => {
    saveAzkarAutoplay(true);
    expect(storage.getBoolean(storageKeys.azkar.audioAutoplay)).toBe(true);
  });

  it('falls back to off when storage cannot be read', () => {
    const spy = jest.spyOn(storage, 'getBoolean').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    expect(readAzkarAutoplay()).toBe(false);
    spy.mockRestore();
  });

  it('still returns the value when storage cannot be written', () => {
    const spy = jest.spyOn(storage, 'set').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    expect(saveAzkarAutoplay(true)).toBe(true);
    spy.mockRestore();
  });
});
