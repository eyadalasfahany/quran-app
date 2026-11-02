import { act, renderHook } from '@testing-library/react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';

import { getHijriAdjustDays, setHijriAdjustDays, useHijriAdjustment } from './adjustment';

describe('Hijri adjustment', () => {
  beforeEach(() => {
    storage.remove(storageKeys.hijriAdjustDays);
  });

  it('defaults to zero and stores nothing for zero', () => {
    expect(getHijriAdjustDays()).toBe(0);
    setHijriAdjustDays(0);
    expect(storage.getNumber(storageKeys.hijriAdjustDays)).toBeUndefined();
  });

  it('clamps stored values to −2…+2', () => {
    setHijriAdjustDays(7);
    expect(getHijriAdjustDays()).toBe(2);
    setHijriAdjustDays(-7);
    expect(getHijriAdjustDays()).toBe(-2);
  });

  it('is live: the hook re-renders when the value changes', async () => {
    const { result } = await renderHook(() => useHijriAdjustment());
    expect(result.current[0]).toBe(0);

    await act(async () => {
      result.current[1](1);
    });

    expect(result.current[0]).toBe(1);
  });
});
