import { fireEvent } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { usePlayerStore } from '../playerStore';

import { PlayerSpeedMenu } from './PlayerSpeedMenu';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 59 }) };
});

jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SymbolView: () => createElement(View, {} as ComponentProps<typeof View>) };
});

const ar = ['٠٫٥×', '٠٫٧٥×', '١×', '١٫٢٥×', '١٫٥×', '٢×'];
const en = ['0.5×', '0.75×', '1×', '1.25×', '1.5×', '2×'];

beforeEach(() => {
  usePlayerStore.setState({ speed: 1 });
});

describe('PlayerSpeedMenu', () => {
  it.each(locales)('offers the six rates in %s, titled Speed', async (locale) => {
    const view = await renderUi(<PlayerSpeedMenu onClose={() => undefined} visible />, { locale, theme: 'dark' });
    const labels = locale === 'ar' ? ar : en;

    labels.forEach((label) => expect(view.getByRole('radio', { name: label })).toBeOnTheScreen());
    expect(view.getAllByRole('radio')).toHaveLength(6);
    expect(view.getByText(locale === 'ar' ? 'السرعة' : 'Speed')).toBeOnTheScreen();
  });

  it('checks the current rate only', async () => {
    usePlayerStore.setState({ speed: 1.5 });
    const view = await renderUi(<PlayerSpeedMenu onClose={() => undefined} visible />, { locale: 'en' });

    expect(view.getByRole('radio', { name: '1.5×' }).props.accessibilityState).toMatchObject({ checked: true });
    expect(view.getByRole('radio', { name: '1×' }).props.accessibilityState).toMatchObject({ checked: false });
  });

  it('sets the chosen rate on the store and closes', async () => {
    const onClose = jest.fn();
    const view = await renderUi(<PlayerSpeedMenu onClose={onClose} visible />, { locale: 'en' });

    fireEvent.press(view.getByRole('radio', { name: '0.75×' }));

    expect(usePlayerStore.getState().speed).toBe(0.75);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when not visible', async () => {
    const view = await renderUi(<PlayerSpeedMenu onClose={() => undefined} visible={false} />, { locale: 'en' });

    expect(view.queryByRole('radio', { name: '1×' })).toBeNull();
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/PlayerSpeedMenu.tsx')).toEqual([]);
  });
});
