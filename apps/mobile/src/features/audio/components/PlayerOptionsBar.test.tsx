import { fireEvent, waitFor } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { AccessibilityInfo } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import { useSurahVerses, type SurahVerse } from '../hooks/useSurahVerses';
import { usePlayerStore } from '../playerStore';
import { resetSleepTimerForTests, useSleepTimerStore } from '../sleep-timer';
import { PlayerOptionsBar } from './PlayerOptionsBar';

jest.mock('../player', () => ({ pause: jest.fn(), seek: jest.fn(), setRepeat: jest.fn(() => true) }));

// Seven ayahs of a surah with ids 101 to 107 and numbers 1 to 7.
const SURAH: SurahVerse[] = [1, 2, 3, 4, 5, 6, 7].map((number) => ({ id: 100 + number, number }));

jest.mock('../hooks/useSurahVerses', () => ({
  ...jest.requireActual<typeof import('../hooks/useSurahVerses')>('../hooks/useSurahVerses'),
  useSurahVerses: jest.fn(() => []),
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 59 }) };
});

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
    resetSleepTimerForTests();
    usePlayerStore.setState({ chapterId: null, activeVerseId: null, repeat: null });
    jest.mocked(useSurahVerses).mockReturnValue([]);
    mockLiquidGlass.mockReturnValue(false);
    jest.mocked(AccessibilityInfo.isReduceTransparencyEnabled).mockResolvedValue(false);
  });

  it.each(locales)('shows the three labels in %s: range disabled without an ayah, repeat and sleep enabled', async (locale) => {
    const view = await renderUi(<PlayerOptionsBar versesCount={7} />, { locale, theme: 'dark' });

    if (locale === 'ar') {
      expect(view.getByText('تكرار')).toBeOnTheScreen();
      expect(view.getByText('الآيات ١–٧')).toBeOnTheScreen();
      expect(view.getByText('مؤقت النوم')).toBeOnTheScreen();
      expect(view.getByRole('button', { name: 'عدد مرات التكرار' })).toBeEnabled();
    } else {
      expect(view.getByText('Repeat')).toBeOnTheScreen();
      expect(view.getByText('Ayahs 1–7')).toBeOnTheScreen();
      expect(view.getByText('Sleep timer')).toBeOnTheScreen();
    }
    expect(view.getAllByRole('button')).toHaveLength(3);
    expect(view.getByTestId('player-option-repeat').props.accessibilityState).toMatchObject({ disabled: false });
    expect(view.getByTestId('player-option-range').props.accessibilityState).toMatchObject({ disabled: true });
    expect(view.getByTestId('player-option-sleep').props.accessibilityState).toMatchObject({ disabled: false });
  });

  it('shows exactly three options: repeat, range and sleep', async () => {
    const view = await renderUi(<PlayerOptionsBar versesCount={7} />, { locale: 'en' });

    expect(view.queryByTestId('player-option-speed')).toBeNull();
    expect(view.getByTestId('player-option-repeat')).toBeOnTheScreen();
    expect(view.getByTestId('player-option-range')).toBeOnTheScreen();
    expect(view.getByTestId('player-option-sleep')).toBeOnTheScreen();
  });

  it('has no speed menu', async () => {
    const view = await renderUi(<PlayerOptionsBar versesCount={7} />, { locale: 'en' });

    expect(view.queryByText('Speed')).toBeNull();
    expect(view.queryByRole('button', { name: /Speed/ })).toBeNull();
  });

  it('opens the sleep menu from its item', async () => {
    const view = await renderUi(<PlayerOptionsBar versesCount={7} />, { locale: 'en' });

    fireEvent.press(view.getByRole('button', { name: 'Sleep timer' }));
    await waitFor(() => expect(view.getByRole('radio', { name: '15 minutes' })).toBeOnTheScreen());
  });

  it('shows the remaining minutes in the accent when a timer is armed', async () => {
    useSleepTimerStore.getState().choose('minutes30');
    const view = await renderUi(<PlayerOptionsBar versesCount={7} />, { locale: 'ar', theme: 'dark' });
    const label = view.getByText('٣٠ د');

    expect(flatStyle(label.props.style)).toMatchObject({
      color: dark.playerAccent,
      fontFamily: 'IBMPlexSansArabic-SemiBold',
    });
    expect(view.getByTestId('player-option-sleep').props.accessibilityState).toMatchObject({ selected: true });
    expect(view.getByRole('button', { name: 'مؤقت النوم، ٣٠ دقيقة متبقية' })).toBeOnTheScreen();
  });

  it('shows the end-of-surah label when that timer is armed', async () => {
    usePlayerStore.setState({ chapterId: 1 });
    useSleepTimerStore.getState().choose('endOfSurah');
    const view = await renderUi(<PlayerOptionsBar versesCount={7} />, { locale: 'en' });

    expect(view.getByText('End of surah')).toBeOnTheScreen();
  });

  it('keeps the sleep item in the default colour when no timer is armed', async () => {
    const view = await renderUi(<PlayerOptionsBar versesCount={7} />, { locale: 'en', theme: 'dark' });

    expect(flatStyle(view.getByText('Sleep timer').props.style).color).toBe(dark.playerInk);
    expect(view.getByTestId('player-option-sleep').props.accessibilityState).toMatchObject({ selected: false });
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
    // The player is dark in every app theme, so the light theme must not tint its glass light.
    expect(view.getByTestId('player-options-glass', { includeHiddenElements: true }).props.colorScheme).toBe('dark');
  });

  it('shows the range label without numbers when no surah is loaded', async () => {
    const view = await renderUi(<PlayerOptionsBar versesCount={0} />);

    expect(view.getByText('الآيات')).toBeOnTheScreen();
    expect(view.queryByText(/–/)).toBeNull();
  });

  it('keeps the bar as a 3-column row with 4 pt gaps and 6 pt padding', async () => {
    const view = await renderUi(<PlayerOptionsBar versesCount={7} />);
    const bar = flatStyle(view.getByTestId('player-options').props.style);

    expect(bar).toMatchObject({ flexDirection: 'row', gap: 4, padding: 6 });
    expect(bar.borderRadius).toBe(28);
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/PlayerOptionsBar.tsx')).toEqual([]);
  });

  it('shows the set repeat with its count and accent, and the set range', async () => {
    jest.mocked(useSurahVerses).mockReturnValue(SURAH);
    usePlayerStore.setState({ activeVerseId: 102, chapterId: 2, repeat: { fromVerseId: 102, toVerseId: 104, count: 3, done: 0 } });
    const view = await renderUi(<PlayerOptionsBar versesCount={7} />, { locale: 'ar', theme: 'dark' });

    expect(view.getByText('تكرار ٣×')).toBeOnTheScreen();
    expect(flatStyle(view.getByText('تكرار ٣×').props.style)).toMatchObject({ color: dark.playerAccent });
    expect(view.getByTestId('player-option-repeat').props.accessibilityState).toMatchObject({ selected: true });
    expect(view.getByRole('button', { name: 'تكرار ٣ مرات، الآيات ٢–٤' })).toBeOnTheScreen();
    expect(view.getByText('الآيات ٢–٤')).toBeOnTheScreen();
  });

  it('shows ∞ as is, and the whole surah when the set range is not known', async () => {
    usePlayerStore.setState({ activeVerseId: 102, chapterId: 2, repeat: { fromVerseId: 102, toVerseId: 104, count: Infinity, done: 0 } });
    const view = await renderUi(<PlayerOptionsBar versesCount={7} />, { locale: 'en' });

    expect(view.getByText('Repeat ∞')).toBeOnTheScreen();
    expect(view.getByText('Ayahs 1–7')).toBeOnTheScreen();
  });

  it('shows the plain repeat label, unaccented, when no repeat is set', async () => {
    const view = await renderUi(<PlayerOptionsBar versesCount={7} />, { locale: 'en', theme: 'dark' });

    expect(flatStyle(view.getByText('Repeat').props.style)).toMatchObject({ color: dark.playerInk });
    expect(view.getByTestId('player-option-repeat').props.accessibilityState).toMatchObject({ selected: false });
  });

  it('opens the repeat menu from its item', async () => {
    const view = await renderUi(<PlayerOptionsBar versesCount={7} />, { locale: 'en' });

    fireEvent.press(view.getByRole('button', { name: 'Repeat count' }));
    await waitFor(() => expect(view.getByRole('radio', { name: '3×' })).toBeOnTheScreen());
  });

  it('enables the range item only with a recited ayah, and opens the range picker from it', async () => {
    jest.mocked(useSurahVerses).mockReturnValue(SURAH);
    const view = await renderUi(<PlayerOptionsBar versesCount={7} />, { locale: 'en' });
    expect(view.getByTestId('player-option-range').props.accessibilityState).toMatchObject({ disabled: true });

    usePlayerStore.setState({ activeVerseId: 101, chapterId: 2 });
    const enabled = await renderUi(<PlayerOptionsBar versesCount={7} />, { locale: 'en' });
    expect(enabled.getByTestId('player-option-range').props.accessibilityState).toMatchObject({ disabled: false });
    fireEvent.press(enabled.getByRole('button', { name: 'Ayahs 1–7' }));
    await waitFor(() => expect(enabled.getByText('From ayah')).toBeOnTheScreen());
  });
});
