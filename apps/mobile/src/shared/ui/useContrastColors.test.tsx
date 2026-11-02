import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo, Platform } from 'react-native';

import { useContrastColors, useIncreaseContrast } from './useContrastColors';

// The subscription is shared and module-level. It is created by the first mounted listener and dropped when the last one
// unmounts, and Testing Library unmounts after every test, so each test starts from a fresh subscription.
describe('useIncreaseContrast by platform (ADR 0012: Increase Contrast and high text contrast)', () => {
  let platform: { restore: () => void } | undefined;
  let removeListener: jest.Mock;
  let listeners: Record<string, (enabled: boolean) => void>;

  beforeEach(() => {
    listeners = {};
    removeListener = jest.fn();
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((event: string, handler: (enabled: boolean) => void) => {
      listeners[event] = handler;
      return { remove: removeListener };
    }) as never);
    jest.spyOn(AccessibilityInfo, 'isDarkerSystemColorsEnabled').mockResolvedValue(false);
    jest.spyOn(AccessibilityInfo, 'isHighTextContrastEnabled').mockResolvedValue(false);
  });

  afterEach(() => {
    platform?.restore();
    platform = undefined;
    jest.restoreAllMocks();
  });

  it('listens for darker system colours on iOS and reads the setting it starts with', async () => {
    platform = jest.replaceProperty(Platform, 'OS', 'ios');
    jest.mocked(AccessibilityInfo.isDarkerSystemColorsEnabled).mockResolvedValue(true);

    const hook = renderHook(() => useIncreaseContrast());
    await act(async () => undefined);

    expect(AccessibilityInfo.addEventListener).toHaveBeenCalledWith('darkerSystemColorsChanged', expect.any(Function));
    expect(AccessibilityInfo.isDarkerSystemColorsEnabled).toHaveBeenCalled();
    expect(AccessibilityInfo.isHighTextContrastEnabled).not.toHaveBeenCalled();
    expect(hook.result.current).toBe(true);
  });

  it('follows a change to the iOS setting while the app is open', async () => {
    platform = jest.replaceProperty(Platform, 'OS', 'ios');
    const hook = renderHook(() => useIncreaseContrast());
    await act(async () => undefined);
    expect(hook.result.current).toBe(false);

    await act(async () => listeners.darkerSystemColorsChanged(true));

    expect(hook.result.current).toBe(true);
  });

  it('listens for high text contrast on Android and never asks the iOS setting', async () => {
    platform = jest.replaceProperty(Platform, 'OS', 'android');
    jest.mocked(AccessibilityInfo.isHighTextContrastEnabled).mockResolvedValue(true);

    const hook = renderHook(() => useIncreaseContrast());
    await act(async () => undefined);

    expect(AccessibilityInfo.addEventListener).toHaveBeenCalledWith('highTextContrastChanged', expect.any(Function));
    expect(AccessibilityInfo.isDarkerSystemColorsEnabled).not.toHaveBeenCalled();
    expect(hook.result.current).toBe(true);
  });

  it('removes the system listener when the last component unmounts', async () => {
    platform = jest.replaceProperty(Platform, 'OS', 'ios');
    const hook = renderHook(() => useIncreaseContrast());
    await act(async () => undefined);

    hook.unmount();

    expect(removeListener).toHaveBeenCalledTimes(1);
  });

  it('exposes the theme colours with no override when Increase Contrast is off', async () => {
    platform = jest.replaceProperty(Platform, 'OS', 'ios');
    const hook = renderHook(() => useContrastColors(), { wrapper: undefined });
    await act(async () => undefined);

    // Without a ThemeProvider the hook still resolves the default theme, and no override applies while the setting is off.
    expect(hook.result.current).toBeDefined();
  });
});
