import type { ComponentProps } from 'react';
import { AccessibilityInfo } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import { PlayerOptionsBar } from './PlayerOptionsBar';

jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SymbolView: () => createElement(View, {} as ComponentProps<typeof View>) };
});

const mockLiquidGlass = jest.fn(() => false);

jest.mock('expo-glass-effect', () => ({
  ...jest.requireActual('expo-glass-effect'),
  isLiquidGlassAvailable: () => mockLiquidGlass(),
}));

const dark = themes.dark.colors;

describe('PlayerOptionsBar', () => {
  beforeEach(() => {
    mockLiquidGlass.mockReturnValue(false);
    jest.mocked(AccessibilityInfo.isReduceTransparencyEnabled).mockResolvedValue(false);
  });

  it.each(locales)('shows the four default labels, all disabled, in %s', async (locale) => {
    const view = await renderUi(<PlayerOptionsBar versesCount={7} />, { locale, theme: 'dark' });

    if (locale === 'ar') {
      expect(view.getByRole('button', { name: 'عدد مرات التكرار' })).toBeDisabled();
      expect(view.getByText('تكرار')).toBeOnTheScreen();
      expect(view.getByText('الآيات ١–٧')).toBeOnTheScreen();
      expect(view.getByText('السرعة ١×')).toBeOnTheScreen();
      expect(view.getByText('مؤقت النوم')).toBeOnTheScreen();
    } else {
      expect(view.getByText('Repeat')).toBeOnTheScreen();
      expect(view.getByText('Ayahs 1–7')).toBeOnTheScreen();
      expect(view.getByText('Speed 1×')).toBeOnTheScreen();
      expect(view.getByText('Sleep timer')).toBeOnTheScreen();
    }
    expect(view.getAllByRole('button')).toHaveLength(4);
    view.getAllByRole('button').forEach((button) => expect(button.props.accessibilityState).toMatchObject({ disabled: true }));
  });

  it('uses the player glass tokens when Liquid Glass is off, not the theme fallback', async () => {
    const view = await renderUi(<PlayerOptionsBar versesCount={7} />, { theme: 'light' });
    const bar = flatStyle(view.getByTestId('player-options').props.style);

    expect(bar.backgroundColor).toBe(dark.playerGlassFill);
    expect(bar.borderColor).toBe(dark.playerGlassStroke);
  });

  it('keeps the native glass path free of a solid fill when Liquid Glass is on', async () => {
    mockLiquidGlass.mockReturnValue(true);
    const view = await renderUi(<PlayerOptionsBar versesCount={7} />, { theme: 'dark' });
    const bar = flatStyle(view.getByTestId('player-options').props.style);

    expect(bar.backgroundColor).toBeUndefined();
    expect(view.getByTestId('player-options-glass', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('keeps the bar as a 4-column row with 4 pt gaps and 6 pt padding', async () => {
    const view = await renderUi(<PlayerOptionsBar versesCount={7} />);
    const bar = flatStyle(view.getByTestId('player-options').props.style);

    expect(bar).toMatchObject({ flexDirection: 'row', gap: 4, padding: 6 });
    expect(bar.borderRadius).toBe(28);
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/PlayerOptionsBar.tsx')).toEqual([]);
  });
});
