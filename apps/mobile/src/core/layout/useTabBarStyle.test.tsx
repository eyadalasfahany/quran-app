import { highContrast } from '@quran/design-tokens';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';

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
    });
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

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('core/layout/useTabBarStyle.ts')).toEqual([]);
  });
});
