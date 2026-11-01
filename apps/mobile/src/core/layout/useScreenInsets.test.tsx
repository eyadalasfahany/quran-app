import { renderHook } from '@testing-library/react-native';
import { I18nManager } from 'react-native';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { screenInsetsFor, useScreenInsets } from './useScreenInsets';

// A landscape phone: a notch-side inset on the left, a smaller one on the right, and the status and home areas.
const insets = { bottom: 21, left: 44, right: 12, top: 24 };

function wrapper({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={{ frame: { height: 411, width: 900, x: 0, y: 0 }, insets }}>{children}</SafeAreaProvider>
  );
}

describe('screenInsetsFor', () => {
  it('maps left to start and right to end in LTR', () => {
    expect(screenInsetsFor(insets, false)).toEqual({ bottom: 21, end: 12, start: 44, top: 24 });
  });

  it('maps right to start and left to end in RTL', () => {
    expect(screenInsetsFor(insets, true)).toEqual({ bottom: 21, end: 44, start: 12, top: 24 });
  });

  it('keeps top and bottom in both directions', () => {
    expect(screenInsetsFor(insets, true)).toMatchObject({ bottom: 21, top: 24 });
    expect(screenInsetsFor(insets, false)).toMatchObject({ bottom: 21, top: 24 });
  });

  it('is all zero for a window without insets', () => {
    expect(screenInsetsFor({ bottom: 0, left: 0, right: 0, top: 0 }, true)).toEqual({ bottom: 0, end: 0, start: 0, top: 0 });
  });
});

describe('useScreenInsets', () => {
  const original = I18nManager.isRTL;

  afterEach(() => {
    I18nManager.isRTL = original;
  });

  it('reads the safe area in LTR', async () => {
    I18nManager.isRTL = false;
    const hook = await renderHook(() => useScreenInsets(), { wrapper });

    expect(hook.result.current).toEqual({ bottom: 21, end: 12, start: 44, top: 24 });
  });

  it('reads the safe area mirrored in RTL', async () => {
    I18nManager.isRTL = true;
    const hook = await renderHook(() => useScreenInsets(), { wrapper });

    expect(hook.result.current).toEqual({ bottom: 21, end: 44, start: 12, top: 24 });
  });

  it('follows a direction change on the next render', async () => {
    I18nManager.isRTL = false;
    const hook = await renderHook(() => useScreenInsets(), { wrapper });

    I18nManager.isRTL = true;
    await hook.rerender({});

    expect(hook.result.current.start).toBe(12);
  });
});
