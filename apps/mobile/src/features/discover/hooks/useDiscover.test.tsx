import { act, renderHook } from '@testing-library/react-native';

import { storage } from '@/core/storage/mmkv';

import { markDiscovered, readDiscoverState, startTour } from '../store';

import { useDiscoverProgress, useMarkDiscoveredOnFocus } from './useDiscover';

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    ...jest.requireActual<typeof import('expo-router')>('expo-router'),
    // Run the focus effect at once, as if the screen had just gained focus.
    useFocusEffect: (callback: () => void) => {
      useEffect(callback, [callback]);
    },
  };
});

beforeEach(() => {
  storage.clearAll();
});

describe('useDiscoverProgress', () => {
  it('updates when a row is marked', async () => {
    const { result } = await renderHook(() => useDiscoverProgress());
    expect(result.current.doneCount).toBe(0);
    await act(async () => {
      markDiscovered('app.search');
    });
    expect(result.current.doneCount).toBe(1);
  });
});

describe('useMarkDiscoveredOnFocus', () => {
  it('ticks the row when the screen gains focus', async () => {
    await renderHook(() => useMarkDiscoveredOnFocus('app.settings'));
    const { result } = await renderHook(() => useDiscoverProgress());
    expect(result.current.rows.find((row) => row.entry.id === 'app.settings')?.done).toBe(true);
  });

  it('does not tick while the tour is on that step, so its tip shows and «التالي» completes it', async () => {
    startTour('app.settings');
    await renderHook(() => useMarkDiscoveredOnFocus('app.settings'));
    expect(readDiscoverState()).toMatchObject({ done: [], tourStep: 'app.settings' });
  });
});
