import { act, renderHook } from '@testing-library/react-native';
import type { HostInstance } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { duration } from '@quran/design-tokens';

import { resetDrawnOrnamentsForTests, useDrawOnView } from './useDrawOnView';

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: jest.fn(() => false),
}));

const reducedMotion = jest.mocked(useReducedMotion);

// A view whose window position the test moves, as scrolling would.
function viewAt(position: { y: number }) {
  const measureInWindow = jest.fn((callback: (x: number, y: number, width: number, height: number) => void) =>
    callback(0, position.y, 100, 50),
  );
  return { current: { measureInWindow } as unknown as HostInstance };
}

describe('useDrawOnView', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    reducedMotion.mockReturnValue(false);
    resetDrawnOrnamentsForTests();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('waits below the window, then draws in once scrolled into view', async () => {
    const position = { y: 5000 };
    const { result } = await renderHook(() => useDrawOnView(viewAt(position)));

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.value).toBe(0);

    position.y = 200;
    await act(async () => {
      jest.advanceTimersByTime(200 + duration.draw);
    });
    expect(result.current.value).toBe(1);
  });

  it('does not draw a view scrolled past above the window', async () => {
    const { result } = await renderHook(() => useDrawOnView(viewAt({ y: -80 })));

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.value).toBe(0);
  });

  it('stops checking once drawn', async () => {
    const ref = viewAt({ y: 0 });
    await renderHook(() => useDrawOnView(ref));
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    const checks = jest.mocked(ref.current.measureInWindow).mock.calls.length;

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(ref.current.measureInWindow).toHaveBeenCalledTimes(checks);
  });

  it('starts drawn with Reduce Motion on, without checking', async () => {
    reducedMotion.mockReturnValue(true);
    const ref = viewAt({ y: 0 });
    const { result } = await renderHook(() => useDrawOnView(ref));

    expect(result.current.value).toBe(1);
    expect(ref.current.measureInWindow).not.toHaveBeenCalled();
  });

  it('draws a key once per session', async () => {
    const first = await renderHook(() => useDrawOnView(viewAt({ y: 0 }), 'سورة البقرة'));
    await act(async () => {
      jest.advanceTimersByTime(200 + duration.draw);
    });
    await first.unmount();

    const again = await renderHook(() => useDrawOnView(viewAt({ y: 5000 }), 'سورة البقرة'));
    expect(again.result.current.value).toBe(1);
    await again.unmount();

    const other = await renderHook(() => useDrawOnView(viewAt({ y: 5000 }), 'سورة آل عمران'));
    expect(other.result.current.value).toBe(0);
  });
});
