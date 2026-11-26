import { act, renderHook } from '@testing-library/react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';
import { resetWindowSize, setWindowSize } from '../../../jest/window-size';

import { readTimelineCollapsed, useTimelineCollapse, useTimelineCollapseStore } from './timeline-collapse';

afterEach(() => {
  useTimelineCollapseStore.getState().setCollapsed(false);
  useTimelineCollapseStore.getState().setShortOpen(false);
  resetWindowSize();
});

describe('Seerah timeline collapse', () => {
  it('saves a tall window\'s choice under seerah.timelineCollapsed and reads it back', async () => {
    expect(storageKeys.seerah.timelineCollapsed).toBe('seerah.timelineCollapsed');
    const { result } = await renderHook(() => useTimelineCollapse());
    expect(result.current[0]).toBe(false);
    await act(async () => result.current[1](true));
    expect(result.current[0]).toBe(true);
    expect(storage.getBoolean(storageKeys.seerah.timelineCollapsed)).toBe(true);
    expect(readTimelineCollapsed()).toBe(true);
  });

  it('starts expanded when nothing is saved', () => {
    storage.remove(storageKeys.seerah.timelineCollapsed);
    expect(readTimelineCollapsed()).toBe(false);
  });

  it('a short window starts collapsed, opens on the tap without saving it, and forgets the tap when it grows tall', async () => {
    setWindowSize(874, 402);
    const { result, rerender } = await renderHook(() => useTimelineCollapse());
    expect(result.current[0]).toBe(true);
    await act(async () => result.current[1](false));
    expect(result.current[0]).toBe(false);
    expect(useTimelineCollapseStore.getState().collapsed).toBe(false);
    expect(useTimelineCollapseStore.getState().shortOpen).toBe(true);
    await act(async () => {
      setWindowSize(390, 844);
    });
    await rerender({});
    expect(useTimelineCollapseStore.getState().shortOpen).toBe(false);
    await act(async () => {
      setWindowSize(874, 402);
    });
    await rerender({});
    expect(result.current[0]).toBe(true);
  });
});
