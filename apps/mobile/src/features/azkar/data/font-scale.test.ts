import { storage, storageKeys } from '@/core/storage/mmkv';

import { readAzkarFontScale, saveAzkarFontScale, stepAzkarFontScale } from './font-scale';

describe('azkar font scale', () => {
  beforeEach(() => {
    storage.remove(storageKeys.azkar.fontScale);
  });

  it('defaults to 1 when nothing is saved', () => {
    expect(readAzkarFontScale()).toBe(1);
  });

  it('saves and reads back the value, snapped to the reader stepper', () => {
    expect(saveAzkarFontScale(1.37)).toBe(1.4);
    expect(readAzkarFontScale()).toBe(1.4);
  });

  it('clamps to the reader range', () => {
    expect(saveAzkarFontScale(9)).toBe(1.6);
    expect(saveAzkarFontScale(0.1)).toBe(0.8);
  });

  it('steps one reader step up or down and stops at the range ends', () => {
    expect(stepAzkarFontScale(1, 1)).toBe(1.1);
    expect(stepAzkarFontScale(1, -1)).toBe(0.9);
    expect(stepAzkarFontScale(1.6, 1)).toBe(1.6);
    expect(stepAzkarFontScale(0.8, -1)).toBe(0.8);
  });
});
