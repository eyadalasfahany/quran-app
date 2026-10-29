import { act, fireEvent, waitFor } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { useSurahVerses, type SurahVerse } from '../hooks/useSurahVerses';
import { setRepeat } from '../player';
import { usePlayerStore } from '../playerStore';

import { PlayerRangeMenu } from './PlayerRangeMenu';

jest.mock('../player', () => ({ pause: jest.fn(), seek: jest.fn(), setRepeat: jest.fn(() => true) }));

// Seven ayahs of a surah with ids 101 to 107 and numbers 1 to 7.
const SURAH: SurahVerse[] = [1, 2, 3, 4, 5, 6, 7].map((number) => ({ id: 100 + number, number }));

jest.mock('../hooks/useSurahVerses', () => ({
  ...jest.requireActual<typeof import('../hooks/useSurahVerses')>('../hooks/useSurahVerses'),
  useSurahVerses: jest.fn(() => []),
}));

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { __esModule: true, ...actual, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 59 }) };
});

jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SymbolView: () => createElement(View, {} as ComponentProps<typeof View>) };
});

beforeEach(() => {
  jest.mocked(setRepeat).mockClear();
  jest.mocked(setRepeat).mockReturnValue(true);
  jest.mocked(useSurahVerses).mockReturnValue(SURAH);
  jest.mocked(useReducedMotion).mockReturnValue(false);
  usePlayerStore.setState({ activeVerseId: 103, chapterId: 2, repeat: null });
});

function menu(onClose = () => undefined) {
  return <PlayerRangeMenu onClose={onClose} visible />;
}

// Presses in an async act, so the state the press sets has rendered before the next step reads it.
async function pressAsync(element: Parameters<typeof fireEvent.press>[0]) {
  await act(async () => {
    fireEvent.press(element);
  });
}

function checkedIn(view: { getByTestId: (id: string) => { props: { accessibilityState?: object } } }, id: string) {
  return (view.getByTestId(id).props.accessibilityState as { checked?: boolean } | undefined)?.checked === true;
}

describe('PlayerRangeMenu', () => {
  it('renders nothing when not visible', async () => {
    const view = await renderUi(<PlayerRangeMenu onClose={() => undefined} visible={false} />, { locale: 'en' });

    expect(view.queryByRole('radio')).toBeNull();
  });

  it.each(locales)('shows both columns, the title and the buttons in %s', async (locale) => {
    const view = await renderUi(menu(), { locale, theme: 'dark' });
    const from = locale === 'ar' ? 'من الآية' : 'From ayah';
    const to = locale === 'ar' ? 'إلى الآية' : 'To ayah';
    const ayah = locale === 'ar' ? 'الآية ٣' : 'Ayah 3';

    expect(view.getByText(from)).toBeOnTheScreen();
    expect(view.getByText(to)).toBeOnTheScreen();
    expect(view.getAllByRole('radio', { name: ayah })).toHaveLength(2);
    expect(view.getByRole('button', { name: locale === 'ar' ? 'إلغاء' : 'Cancel' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: locale === 'ar' ? 'تم' : 'Done' })).toBeOnTheScreen();
  });

  it('opens on the recited ayah alone when no range is set', async () => {
    const view = await renderUi(menu(), { locale: 'en' });

    expect(checkedIn(view, 'player-range-from-103')).toBe(true);
    expect(checkedIn(view, 'player-range-to-103')).toBe(true);
    expect(checkedIn(view, 'player-range-from-104')).toBe(false);
  });

  it('opens on the range already set', async () => {
    usePlayerStore.setState({ repeat: { fromVerseId: 102, toVerseId: 105, count: 5, done: 0 } });
    const view = await renderUi(menu(), { locale: 'en' });

    expect(checkedIn(view, 'player-range-from-102')).toBe(true);
    expect(checkedIn(view, 'player-range-to-105')).toBe(true);
  });

  it('keeps from at or before to: a later start moves the end with it', async () => {
    const view = await renderUi(menu(), { locale: 'en' });

    await pressAsync(view.getByTestId('player-range-from-106', { includeHiddenElements: true }));

    expect(checkedIn(view, 'player-range-from-106')).toBe(true);
    expect(checkedIn(view, 'player-range-to-106')).toBe(true);
  });

  it('disables ends before the start, and does not move to them', async () => {
    const view = await renderUi(menu(), { locale: 'en' });

    await pressAsync(view.getByTestId('player-range-from-105', { includeHiddenElements: true }));
    const earlier = view.getByTestId('player-range-to-104', { includeHiddenElements: true });
    expect(earlier.props.accessibilityState).toMatchObject({ disabled: true });
    await pressAsync(earlier);

    expect(checkedIn(view, 'player-range-to-105')).toBe(true);
  });

  it('applies the range with the current count, or 1, through setRepeat', async () => {
    const onClose = jest.fn();
    const view = await renderUi(menu(onClose), { locale: 'en' });

    await pressAsync(view.getByTestId('player-range-from-101', { includeHiddenElements: true }));
    await pressAsync(view.getByTestId('player-range-to-104', { includeHiddenElements: true }));
    await pressAsync(view.getByRole('button', { name: 'Done' }));

    expect(setRepeat).toHaveBeenCalledWith({ fromVerseId: 101, toVerseId: 104, count: 1 });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('keeps the count of the repeat that is set', async () => {
    usePlayerStore.setState({ repeat: { fromVerseId: 102, toVerseId: 102, count: 10, done: 0 } });
    const view = await renderUi(menu(), { locale: 'en' });

    await pressAsync(view.getByRole('button', { name: 'Done' }));

    expect(setRepeat).toHaveBeenCalledWith({ fromVerseId: 102, toVerseId: 102, count: 10 });
  });

  it('closes without a change on Cancel', async () => {
    const onClose = jest.fn();
    const view = await renderUi(menu(onClose), { locale: 'en' });

    await pressAsync(view.getByRole('button', { name: 'Cancel' }));

    expect(setRepeat).not.toHaveBeenCalled();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('disables Done when there is no recited ayah to start from', async () => {
    usePlayerStore.setState({ activeVerseId: null });
    const view = await renderUi(menu(), { locale: 'en' });

    expect(view.getByRole('button', { name: 'Done' }).props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('slides down before it closes', async () => {
    const onClose = jest.fn();
    const view = await renderUi(menu(onClose), { locale: 'en' });

    await pressAsync(view.getByRole('button', { name: 'Cancel' }));

    // The sheet is still mounted during its slide; onClose runs once the slide has finished.
    expect(onClose).not.toHaveBeenCalled();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('closes after the fade under Reduce Motion', async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    const onClose = jest.fn();
    const view = await renderUi(menu(onClose), { locale: 'en' });

    await pressAsync(view.getByRole('button', { name: 'Cancel' }));

    expect(onClose).not.toHaveBeenCalled();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/PlayerRangeMenu.tsx')).toEqual([]);
  });
});
