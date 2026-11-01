import { act, renderHook } from '@testing-library/react-native';

import { completeHaptic, tapHaptic } from '@/features/azkar/haptics';
import { storage, storageKeys } from '@/core/storage/mmkv';

import { DEFAULT_SIBHA_STATE } from '../data/model';
import { readSibhaState, readSibhaTodayTotal } from '../data/store';
import { SIBHA_TAP_GUARD_MS, useSibha } from './useSibha';

jest.mock('@/features/azkar/haptics', () => ({
  completeHaptic: jest.fn(),
  tapHaptic: jest.fn(),
}));

const now = new Date(2026, 10, 1, 12, 0, 0);

/** Taps once, after the double-tap window has passed, so each tap in a test is a fresh, accepted one. */
async function tapOnce(result: { current: { tap: () => void } }) {
  await act(async () => {
    jest.advanceTimersByTime(SIBHA_TAP_GUARD_MS + 1);
    result.current.tap();
  });
}

describe('useSibha', () => {
  beforeEach(() => {
    storage.remove(storageKeys.sibha.state);
    storage.remove(storageKeys.sibha.today);
    jest.mocked(tapHaptic).mockClear();
    jest.mocked(completeHaptic).mockClear();
    jest.useFakeTimers({ now });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts from the saved counter, or the default', async () => {
    const { result } = await renderHook(() => useSibha());

    expect(result.current).toMatchObject({ count: DEFAULT_SIBHA_STATE.count, label: '', rounds: 0, target: 100 });
  });

  it('counts each tap with a count haptic, and persists it', async () => {
    const { result } = await renderHook(() => useSibha());

    await tapOnce(result);
    await tapOnce(result);

    expect(result.current.count).toBe(2);
    expect(readSibhaState().count).toBe(2);
    expect(readSibhaTodayTotal(now)).toBe(2);
    expect(tapHaptic).toHaveBeenCalledTimes(2);
    expect(completeHaptic).not.toHaveBeenCalled();
  });

  it('ignores a double tap inside the 120 ms guard: one count, one haptic, nothing saved twice', async () => {
    const { result } = await renderHook(() => useSibha());

    await act(async () => {
      result.current.tap();
      jest.advanceTimersByTime(SIBHA_TAP_GUARD_MS - 1);
      result.current.tap();
    });

    expect(result.current.count).toBe(1);
    expect(readSibhaState().count).toBe(1);
    expect(tapHaptic).toHaveBeenCalledTimes(1);
    expect(readSibhaTodayTotal(now)).toBe(1);
  });

  it('accepts a tap exactly at the guard boundary (120 ms after the last accepted tap)', async () => {
    const { result } = await renderHook(() => useSibha());

    await act(async () => {
      result.current.tap();
      jest.advanceTimersByTime(SIBHA_TAP_GUARD_MS);
      result.current.tap();
    });

    expect(result.current.count).toBe(2);
    expect(tapHaptic).toHaveBeenCalledTimes(2);
  });

  it('a rejected double tap cannot complete a round early or fire the success haptic', async () => {
    storage.set(storageKeys.sibha.state, JSON.stringify({ count: 0, label: '', rounds: 0, target: 2 }));
    const { result } = await renderHook(() => useSibha());

    await act(async () => {
      result.current.tap();
      jest.advanceTimersByTime(10);
      result.current.tap();
    });

    expect(result.current.count).toBe(1);
    expect(result.current.rounds).toBe(0);
    expect(completeHaptic).not.toHaveBeenCalled();
  });

  it('completes a round on the tap that reaches the target: a success haptic, one round, and the count back at zero', async () => {
    storage.set(storageKeys.sibha.state, JSON.stringify({ count: 32, label: '', rounds: 0, target: 33 }));
    const { result } = await renderHook(() => useSibha());

    await tapOnce(result);

    expect(completeHaptic).toHaveBeenCalledTimes(1);
    expect(result.current.count).toBe(0);
    expect(result.current.rounds).toBe(1);
    expect(readSibhaState()).toMatchObject({ count: 0, rounds: 1, target: 33 });
    expect(readSibhaTodayTotal(now)).toBe(1);
  });

  it('continues counting in the same session after a round, and completes the next round at the target again', async () => {
    storage.set(storageKeys.sibha.state, JSON.stringify({ count: 0, label: '', rounds: 0, target: 3 }));
    const { result } = await renderHook(() => useSibha());

    for (let i = 0; i < 4; i += 1) {
      await tapOnce(result);
    }

    expect(result.current.count).toBe(1);
    expect(result.current.rounds).toBe(1);
    expect(completeHaptic).toHaveBeenCalledTimes(1);
    expect(readSibhaTodayTotal(now)).toBe(4);
  });

  it('never resets the daily total when a round completes', async () => {
    storage.set(storageKeys.sibha.state, JSON.stringify({ count: 0, label: '', rounds: 0, target: 2 }));
    const { result } = await renderHook(() => useSibha());

    for (let i = 0; i < 6; i += 1) {
      await tapOnce(result);
    }

    expect(result.current.rounds).toBe(3);
    expect(readSibhaTodayTotal(now)).toBe(6);
  });

  it('keeps counting without a round or a success haptic when there is no target', async () => {
    storage.set(storageKeys.sibha.state, JSON.stringify({ count: 0, label: '', rounds: 0, target: null }));
    const { result } = await renderHook(() => useSibha());

    for (let i = 0; i < 150; i += 1) {
      await tapOnce(result);
    }

    expect(result.current.count).toBe(150);
    expect(result.current.rounds).toBe(0);
    expect(completeHaptic).not.toHaveBeenCalled();
  });

  it('resets the count and the rounds to zero, and keeps today’s total, the target and the label', async () => {
    storage.set(storageKeys.sibha.state, JSON.stringify({ count: 0, label: 'تسمية تجريبية', rounds: 0, target: 2 }));
    const { result } = await renderHook(() => useSibha());
    await tapOnce(result);
    await tapOnce(result);
    await tapOnce(result);
    expect(result.current.rounds).toBe(1);

    await act(() => result.current.reset());

    expect(result.current.count).toBe(0);
    expect(result.current.rounds).toBe(0);
    expect(result.current.target).toBe(2);
    expect(result.current.label).toBe('تسمية تجريبية');
    expect(readSibhaTodayTotal(now)).toBe(3);
  });

  it('starts the rounds again when the target changes, and keeps the count', async () => {
    storage.set(storageKeys.sibha.state, JSON.stringify({ count: 0, label: '', rounds: 2, target: 33 }));
    const { result } = await renderHook(() => useSibha());

    await act(() => result.current.chooseTarget(99));

    expect(result.current.rounds).toBe(0);
    expect(result.current.target).toBe(99);
    expect(readSibhaState()).toMatchObject({ rounds: 0, target: 99 });
  });

  it('clears the rounds when the target is cleared to no limit', async () => {
    storage.set(storageKeys.sibha.state, JSON.stringify({ count: 0, label: '', rounds: 4, target: 33 }));
    const { result } = await renderHook(() => useSibha());

    await act(() => result.current.chooseTarget(null));

    expect(result.current.target).toBeNull();
    expect(result.current.rounds).toBe(0);
  });

  it('cuts a label that is too long', async () => {
    const { result } = await renderHook(() => useSibha());

    await act(() => result.current.setLabel('x'.repeat(60)));

    expect(result.current.label).toHaveLength(40);
    expect(readSibhaState().label).toHaveLength(40);
  });

  it('reads the saved counter again when it is mounted, so the count and rounds survive leaving the screen', async () => {
    storage.set(storageKeys.sibha.state, JSON.stringify({ count: 0, label: '', rounds: 0, target: 1 }));
    const first = await renderHook(() => useSibha());
    await tapOnce(first.result);
    first.unmount();

    const second = await renderHook(() => useSibha());
    expect(second.result.current).toMatchObject({ count: 0, rounds: 1 });
  });
});
