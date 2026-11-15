import { act, renderHook } from '@testing-library/react-native';
import { useNavigation } from 'expo-router';

import { useArtReady } from './useArtReady';

jest.mock('expo-router', () => ({ useNavigation: jest.fn() }));

describe('useArtReady', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('is ready at once outside a navigator', async () => {
    jest.mocked(useNavigation).mockImplementation(() => {
      throw new Error('no navigator');
    });
    const { result } = await renderHook(() => useArtReady());
    expect(result.current).toBe(true);
  });

  it('waits for the push transition to end', async () => {
    let end: () => void = () => undefined;
    const unsubscribe = jest.fn();
    jest.mocked(useNavigation).mockReturnValue({
      addListener: jest.fn((event: string, callback: () => void) => {
        if (event === 'transitionEnd') {
          end = callback;
        }
        return unsubscribe;
      }),
    } as unknown as ReturnType<typeof useNavigation>);
    const { result } = await renderHook(() => useArtReady());
    expect(result.current).toBe(false);
    await act(async () => end());
    expect(result.current).toBe(true);
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('draws the art anyway when no transition end arrives', async () => {
    jest.mocked(useNavigation).mockReturnValue({ addListener: jest.fn(() => jest.fn()) } as unknown as ReturnType<typeof useNavigation>);
    const { result } = await renderHook(() => useArtReady());
    expect(result.current).toBe(false);
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(true);
  });
});
