import { fireEvent, waitFor } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { setRepeat } from '../player';
import { usePlayerStore } from '../playerStore';

import { PlayerRepeatMenu } from './PlayerRepeatMenu';

jest.mock('../player', () => ({ pause: jest.fn(), seek: jest.fn(), setRepeat: jest.fn(() => true) }));

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
  usePlayerStore.setState({ activeVerseId: null, chapterId: 2, repeat: null });
});

function menu(onClose = () => undefined) {
  return <PlayerRepeatMenu onClose={onClose} visible />;
}

describe('PlayerRepeatMenu', () => {
  it('renders nothing when not visible', async () => {
    const view = await renderUi(<PlayerRepeatMenu onClose={() => undefined} visible={false} />, { locale: 'en' });

    expect(view.queryByRole('radio')).toBeNull();
  });

  it.each(locales)('offers Off, once, 3×, 5×, 10× and ∞ in %s', async (locale) => {
    const view = await renderUi(menu(), { locale, theme: 'dark' });
    const names = locale === 'ar' ? ['إيقاف', 'مرة', '٣×', '٥×', '١٠×', '∞'] : ['Off', 'Once', '3×', '5×', '10×', '∞'];

    names.forEach((name) => expect(view.getByRole('radio', { name })).toBeOnTheScreen());
    expect(view.getAllByRole('radio')).toHaveLength(6);
    expect(view.getByText(locale === 'ar' ? 'تكرار' : 'Repeat')).toBeOnTheScreen();
  });

  it('disables every count, and Off, while no ayah is recited', async () => {
    const view = await renderUi(menu(), { locale: 'en' });

    view.getAllByRole('radio').forEach((radio) => expect(radio.props.accessibilityState).toMatchObject({ disabled: true }));
    fireEvent.press(view.getByRole('radio', { name: '3×' }));
    expect(setRepeat).not.toHaveBeenCalled();
  });

  it('keeps Off enabled while a repeat is set, so it can always be cleared', async () => {
    usePlayerStore.setState({ repeat: { fromVerseId: 3, toVerseId: 5, count: 3, done: 0 } });
    const view = await renderUi(menu(), { locale: 'en' });

    expect(view.getByRole('radio', { name: 'Off' }).props.accessibilityState).toMatchObject({ disabled: false });
    expect(view.getByRole('radio', { name: '5×' }).props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('repeats the recited ayah alone for a count when no range is set', async () => {
    usePlayerStore.setState({ activeVerseId: 5 });
    const view = await renderUi(menu(), { locale: 'en' });

    fireEvent.press(view.getByRole('radio', { name: '5×' }));

    expect(setRepeat).toHaveBeenCalledWith({ fromVerseId: 5, toVerseId: 5, count: 5 });
  });

  it('repeats the range set in the store with the chosen count', async () => {
    usePlayerStore.setState({ activeVerseId: 5, repeat: { fromVerseId: 3, toVerseId: 6, count: 1, done: 0 } });
    const view = await renderUi(menu(), { locale: 'en' });

    fireEvent.press(view.getByRole('radio', { name: '10×' }));

    expect(setRepeat).toHaveBeenCalledWith({ fromVerseId: 3, toVerseId: 6, count: 10 });
  });

  it('passes ∞ through as the count', async () => {
    usePlayerStore.setState({ activeVerseId: 5 });
    const view = await renderUi(menu(), { locale: 'en' });

    fireEvent.press(view.getByRole('radio', { name: '∞' }));

    expect(setRepeat).toHaveBeenCalledWith({ fromVerseId: 5, toVerseId: 5, count: Infinity });
  });

  it('clears the repeat for Off', async () => {
    usePlayerStore.setState({ activeVerseId: 5, repeat: { fromVerseId: 5, toVerseId: 5, count: 3, done: 1 } });
    const view = await renderUi(menu(), { locale: 'en' });

    fireEvent.press(view.getByRole('radio', { name: 'Off' }));

    expect(usePlayerStore.getState().repeat).toBeNull();
    expect(setRepeat).not.toHaveBeenCalled();
  });

  it('changes nothing when the engine refuses the range, and still closes', async () => {
    jest.mocked(setRepeat).mockReturnValue(false);
    usePlayerStore.setState({ activeVerseId: 5 });
    const onClose = jest.fn();
    const view = await renderUi(menu(onClose), { locale: 'en' });

    fireEvent.press(view.getByRole('radio', { name: '3×' }));

    expect(usePlayerStore.getState().repeat).toBeNull();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('checks the set count only, and reads the count from the store', async () => {
    usePlayerStore.setState({ activeVerseId: 5, repeat: { fromVerseId: 5, toVerseId: 5, count: Infinity, done: 0 } });
    const view = await renderUi(menu(), { locale: 'en' });

    expect(view.getByRole('radio', { name: '∞' }).props.accessibilityState).toMatchObject({ checked: true });
    expect(view.getByRole('radio', { name: 'Off' }).props.accessibilityState).toMatchObject({ checked: false });
  });

  it('uses no raw colour literals and marks the checked count', async () => {
    usePlayerStore.setState({ activeVerseId: 5, repeat: { fromVerseId: 5, toVerseId: 5, count: 3, done: 0 } });
    const view = await renderUi(menu(), { locale: 'en', theme: 'dark' });

    expect(view.getByRole('radio', { name: '3×' }).props.accessibilityState).toMatchObject({ checked: true });
    expect(rawColorLiteralsInFeature('src/features/audio/components/PlayerRepeatMenu.tsx')).toEqual([]);
  });
});
