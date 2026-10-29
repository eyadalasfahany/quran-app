import { act, fireEvent, waitFor } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { BackHandler } from 'react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { PlayerChoiceMenu } from './PlayerChoiceMenu';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 59 }) };
});

jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SymbolView: () => createElement(View, {} as ComponentProps<typeof View>) };
});

const choices = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma', disabled: true },
];

function menu(props: Partial<ComponentProps<typeof PlayerChoiceMenu<string>>> = {}) {
  return (
    <PlayerChoiceMenu<string>
      choices={choices}
      onClose={() => undefined}
      onSelect={() => undefined}
      selected="a"
      testID="menu"
      title="Title"
      visible
      {...props}
    />
  );
}

describe('PlayerChoiceMenu', () => {
  it('renders nothing when not visible', async () => {
    const view = await renderUi(menu({ visible: false }));

    expect(view.queryByText('Alpha')).toBeNull();
  });

  it.each(locales)('renders the title, the choices and Cancel in %s', async (locale) => {
    const view = await renderUi(menu(), { locale, theme: 'dark' });

    expect(view.getByText('Title')).toBeOnTheScreen();
    expect(view.getByRole('radio', { name: 'Alpha' })).toBeOnTheScreen();
    expect(view.getByRole('radio', { name: 'Beta' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: locale === 'ar' ? 'إلغاء' : 'Cancel' })).toBeOnTheScreen();
  });

  it('marks only the selected choice as checked', async () => {
    const view = await renderUi(menu({ selected: 'b' }));

    expect(view.getByRole('radio', { name: 'Alpha' }).props.accessibilityState).toMatchObject({ checked: false });
    expect(view.getByRole('radio', { name: 'Beta' }).props.accessibilityState).toMatchObject({ checked: true });
  });

  it('reports a disabled choice as disabled and does not select it', async () => {
    const onSelect = jest.fn();
    const view = await renderUi(menu({ onSelect }));
    const gamma = view.getByRole('radio', { name: 'Gamma' });

    expect(gamma.props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(gamma);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('selects the pressed choice with its value', async () => {
    const onSelect = jest.fn();
    const view = await renderUi(menu({ onSelect }));

    fireEvent.press(view.getByRole('radio', { name: 'Beta' }));
    expect(onSelect).toHaveBeenCalledWith('b');
  });

  it('slides down, then reports the choice, when a choice is pressed', async () => {
    const onClose = jest.fn();
    const onSelect = jest.fn();
    const view = await renderUi(menu({ onClose, onSelect }), { locale: 'en' });

    fireEvent.press(view.getByRole('radio', { name: 'Beta' }));

    expect(onSelect).toHaveBeenCalledWith('b');
    expect(onClose).not.toHaveBeenCalled();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  // The Android back case runs last: its leftover exit animation would otherwise leak into the next test.
  it.each(['Cancel', 'scrim', 'back'] as const)('slides down, then closes, from %s', async (trigger) => {
    const onClose = jest.fn();
    const add = jest.spyOn(BackHandler, 'addEventListener');
    const view = await renderUi(menu({ onClose }), { locale: 'en' });

    if (trigger === 'Cancel') {
      fireEvent.press(view.getByRole('button', { name: 'Cancel' }));
    } else if (trigger === 'scrim') {
      fireEvent.press(view.getByTestId('menu-scrim', { includeHiddenElements: true }));
    } else {
      const back = add.mock.calls.findLast(([name]) => name === 'hardwareBackPress')?.[1] as (() => boolean) | undefined;
      act(() => {
        back?.();
      });
    }
    add.mockRestore();

    // The sheet is still mounted during its exit; onClose runs once the slide has finished.
    expect(onClose).not.toHaveBeenCalled();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/PlayerChoiceMenu.tsx')).toEqual([]);
  });
});
