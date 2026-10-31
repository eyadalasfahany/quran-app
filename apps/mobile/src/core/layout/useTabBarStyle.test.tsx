import { highContrast } from '@quran/design-tokens';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AccessibilityInfo, I18nManager, Platform } from 'react-native';

import { featureComponentLiterals } from '../../../jest/ui-source';
import { ThemeProvider, themes } from '@/core/theme';

import { useTabBarStyle } from './useTabBarStyle';

function wrapper(name: 'light' | 'dark') {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <ThemeProvider name={name}>{children}</ThemeProvider>;
  };
}

describe('useTabBarStyle', () => {
  beforeEach(() => {
    jest.mocked(AccessibilityInfo.isDarkerSystemColorsEnabled).mockResolvedValue(false);
    I18nManager.isRTL = false;
  });

  it.each(['light', 'dark'] as const)('tints the selected tab brand and the rest muted in %s', async (name) => {
    const { colors, text } = themes[name];
    const { result } = await renderHook(() => useTabBarStyle(), { wrapper: wrapper(name) });

    expect(result.current).toEqual({
      backgroundColor: colors.glassFallback,
      iconColor: { default: colors.inkMuted, selected: colors.brand },
      labelStyle: {
        default: { color: colors.inkMuted, fontFamily: text.label.fontFamily, fontSize: text.label.fontSize },
        selected: { color: colors.brand, fontFamily: text.headline.fontFamily, fontSize: text.label.fontSize },
      },
      tintColor: colors.brand,
      unstable_nativeProps: { direction: 'ltr' },
    });
  });

  it.each(['light', 'dark'] as const)('on Android labels every tab and uses the brand wash indicator in %s (#HomeAndroid)', async (name) => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' });
    try {
      const { result } = await renderHook(() => useTabBarStyle(), { wrapper: wrapper(name) });

      expect(result.current.labelVisibilityMode).toBe('labeled');
      expect(result.current.indicatorColor).toBe(themes[name].colors.glassSelected);
    } finally {
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original });
    }
  });

  it('leaves iOS without Android-only tab bar props', async () => {
    const { result } = await renderHook(() => useTabBarStyle(), { wrapper: wrapper('light') });

    expect(result.current).not.toHaveProperty('labelVisibilityMode');
    expect(result.current).not.toHaveProperty('indicatorColor');
  });

  it('sets label weight through the font file, never fontWeight', async () => {
    const { result } = await renderHook(() => useTabBarStyle(), { wrapper: wrapper('light') });

    expect(result.current.labelStyle).not.toHaveProperty('default.fontWeight');
    expect(result.current.labelStyle).not.toHaveProperty('selected.fontWeight');
  });

  it('uses the high-contrast muted ink when Increase Contrast is on', async () => {
    jest.mocked(AccessibilityInfo.isDarkerSystemColorsEnabled).mockResolvedValue(true);
    const { result } = await renderHook(() => useTabBarStyle(), { wrapper: wrapper('dark') });

    await waitFor(() => expect(result.current.iconColor).toMatchObject({ default: highContrast.dark.inkMuted }));
    expect(result.current.labelStyle).toMatchObject({ default: { color: highContrast.dark.inkMuted } });
  });

  it.each([
    [true, 'rtl'],
    [false, 'ltr'],
  ] as const)('passes the layout direction to the native tab host when isRTL is %s', async (isRTL, direction) => {
    const original = I18nManager.isRTL;
    I18nManager.isRTL = isRTL;
    try {
      const { result } = await renderHook(() => useTabBarStyle(), { wrapper: wrapper('light') });

      expect(result.current.unstable_nativeProps).toEqual({ direction });
    } finally {
      I18nManager.isRTL = original;
    }
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('core/layout/useTabBarStyle.ts')).toEqual([]);
  });
});
