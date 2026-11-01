import { act, renderHook } from '@testing-library/react-native';

import { completeHaptic, tapHaptic } from '@/features/azkar/haptics';
import { storage, storageKeys } from '@/core/storage/mmkv';

import { DEFAULT_SIBHA_STATE } from '../data/model';
import { readSibhaState, readSibhaTodayTotal } from '../data/store';
import { useSibha } from './useSibha';

jest.mock('@/features/azkar/haptics', () => ({
  completeHaptic: jest.fn(),
  tapHaptic: jest.fn(),
}));

const now = new Date(2026, 10, 1, 12, 0, 0);

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

    expect(result.current).toMatchObject({ count: DEFAULT_SIBHA_STATE.count, label: '', target: 100 });
  });

  it('counts each tap with a count haptic, and persists it', async () => {
    const { result } = await renderHook(() => useSibha());

    await act(() => result.current.tap());
    await act(() => result.current.tap());

    expect(result.current.count).toBe(2);
    expect(readSibhaState().count).toBe(2);
    expect(readSibhaTodayTotal(now)).toBe(2);
    expect(tapHaptic).toHaveBeenCalledTimes(2);
    expect(completeHaptic).not.toHaveBeenCalled();
  });

  it('plays the success haptic on the tap that reaches the target, and keeps counting after it', async () => {
    storage.set(storageKeys.sibha.state, JSON.stringify({ count: 32, label: '', target: 33 }));
    const { result } = await renderHook(() => useSibha());

    await act(() => result.current.tap());
    expect(completeHaptic).toHaveBeenCalledTimes(1);

    await act(() => result.current.tap());
    expect(result.current.count).toBe(34);
    expect(completeHaptic).toHaveBeenCalledTimes(1);
  });

  it('resets the count to zero and keeps today’s total and the label', async () => {
    const { result } = await renderHook(() => useSibha());
    await act(() => result.current.setLabel('تسمية تجريبية'));
    await act(() => result.current.tap());
    await act(() => result.current.tap());

    await act(() => result.current.reset());

    expect(result.current.count).toBe(0);
    expect(result.current.label).toBe('تسمية تجريبية');
    expect(readSibhaTodayTotal(now)).toBe(2);
  });

  it('sets and clears the target, and keeps the rest of the counter', async () => {
    const { result } = await renderHook(() => useSibha());
    await act(() => result.current.tap());

    await act(() => result.current.chooseTarget(250));
    expect(result.current.target).toBe(250);
    expect(result.current.count).toBe(1);

    await act(() => result.current.chooseTarget(null));
    expect(readSibhaState().target).toBeNull();
  });

  it('cuts a label that is too long', async () => {
    const { result } = await renderHook(() => useSibha());

    await act(() => result.current.setLabel('x'.repeat(60)));

    expect(result.current.label).toHaveLength(40);
    expect(readSibhaState().label).toHaveLength(40);
  });

  it('reads the saved counter again when it is mounted, so the count survives leaving the screen', async () => {
    const first = await renderHook(() => useSibha());
    await act(() => first.result.current.tap());
    first.unmount();

    const second = await renderHook(() => useSibha());
    expect(second.result.current.count).toBe(1);
  });
});
