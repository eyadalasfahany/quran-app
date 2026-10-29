import { fireEvent } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { usePlayerStore } from '../playerStore';
import { resetSleepTimerForTests, useSleepTimerStore } from '../sleep-timer';

import { PlayerSleepMenu } from './PlayerSleepMenu';

jest.mock('../player', () => ({ pause: jest.fn(), seek: jest.fn() }));

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
  resetSleepTimerForTests();
  usePlayerStore.setState({ activeVerseId: null, chapterId: 1 });
});

afterEach(() => {
  resetSleepTimerForTests();
});

describe('PlayerSleepMenu', () => {
  it.each(locales)('offers Off, the three timers, end of surah, and end of ayah disabled with no recited ayah, in %s', async (locale) => {
    const view = await renderUi(<PlayerSleepMenu onClose={() => undefined} visible />, { locale, theme: 'dark' });
    const names =
      locale === 'ar'
        ? ['إيقاف', '١٥ دقيقة', '٣٠ دقيقة', '٦٠ دقيقة', 'نهاية السورة', 'نهاية الآية']
        : ['Off', '15 minutes', '30 minutes', '60 minutes', 'End of surah', 'End of ayah'];

    names.forEach((name) => expect(view.getByRole('radio', { name })).toBeOnTheScreen());
    expect(view.getByRole('radio', { name: names[5] }).props.accessibilityState).toMatchObject({ disabled: true });
    expect(view.getByRole('radio', { name: names[0] }).props.accessibilityState).toMatchObject({ checked: true });
  });

  it('arms the chosen timer and closes', async () => {
    const onClose = jest.fn();
    const view = await renderUi(<PlayerSleepMenu onClose={onClose} visible />, { locale: 'en' });

    fireEvent.press(view.getByRole('radio', { name: '30 minutes' }));

    expect(useSleepTimerStore.getState().mode).toBe('minutes30');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('arms end of surah on the loaded surah', async () => {
    const view = await renderUi(<PlayerSleepMenu onClose={() => undefined} visible />, { locale: 'en' });

    fireEvent.press(view.getByRole('radio', { name: 'End of surah' }));

    expect(useSleepTimerStore.getState()).toMatchObject({ mode: 'endOfSurah', armedChapterId: 1 });
  });

  it('does not arm end of ayah while no ayah is being recited', async () => {
    const onClose = jest.fn();
    const view = await renderUi(<PlayerSleepMenu onClose={onClose} visible />, { locale: 'en' });

    fireEvent.press(view.getByRole('radio', { name: 'End of ayah' }));

    expect(useSleepTimerStore.getState().mode).toBe('off');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('enables end of ayah while an ayah is being recited', async () => {
    usePlayerStore.setState({ activeVerseId: 3 });
    const view = await renderUi(<PlayerSleepMenu onClose={() => undefined} visible />, { locale: 'en' });

    expect(view.getByRole('radio', { name: 'End of ayah' }).props.accessibilityState).toMatchObject({ disabled: false });
  });

  it('turns a running timer off with Off', async () => {
    useSleepTimerStore.getState().choose('minutes15');
    const view = await renderUi(<PlayerSleepMenu onClose={() => undefined} visible />, { locale: 'en' });

    expect(view.getByRole('radio', { name: '15 minutes' }).props.accessibilityState).toMatchObject({ checked: true });
    fireEvent.press(view.getByRole('radio', { name: 'Off' }));

    expect(useSleepTimerStore.getState().mode).toBe('off');
  });

  it('disables end of surah when no surah is loaded', async () => {
    usePlayerStore.setState({ chapterId: null });
    const view = await renderUi(<PlayerSleepMenu onClose={() => undefined} visible />, { locale: 'en' });

    expect(view.getByRole('radio', { name: 'End of surah' }).props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/PlayerSleepMenu.tsx')).toEqual([]);
  });
});
