import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Dimensions } from 'react-native';

jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SymbolView: ({ name }: { name: { ios: string; android: string } }) =>
      createElement(View, { name, testID: 'sidebar-symbol' } as ComponentProps<typeof View>),
  };
});

function setWidth(width: number): void {
  Dimensions.set({
    screen: { fontScale: 1, height: 800, scale: 1, width },
    window: { fontScale: 1, height: 800, scale: 1, width },
  });
}

describe('adaptive nav', () => {
  afterEach(() => {
    act(() => {
      setWidth(390);
    });
    jest.useRealTimers();
  });

  it('keeps the active section when the window class switches between tabs and the sidebar', async () => {
    setWidth(390);
    const view = await renderRouter('./app');

    expect(view.getSegments()).toEqual(['(main)', '(home)']);
    expect(screen.queryByTestId('sidebar')).not.toBeOnTheScreen();

    await act(async () => {
      router.navigate('/(mushaf)');
    });

    expect(view.getSegments()).toEqual(['(main)', '(mushaf)']);

    await act(async () => {
      setWidth(700);
    });

    expect(view.getSegments()).toEqual(['(main)', '(mushaf)']);
    expect(screen.queryByTestId('sidebar')).not.toBeOnTheScreen();

    await act(async () => {
      setWidth(900);
    });

    expect(view.getSegments()).toEqual(['(main)', '(mushaf)']);
    expect(screen.getByTestId('sidebar-mushaf').props.accessibilityState).toEqual({ selected: true });
    expect(screen.getAllByTestId('sidebar-symbol').map((symbol) => symbol.props.name)).toEqual([
      { ios: 'house', android: 'home' },
      { ios: 'book', android: 'menu_book' },
      { ios: 'headphones', android: 'headphones' },
      { ios: 'pencil', android: 'edit' },
    ]);

    await act(async () => {
      fireEvent.press(screen.getByTestId('sidebar-home'));
    });

    expect(view.getSegments()).toEqual(['(main)', '(home)']);
    expect(screen.getByTestId('sidebar-home').props.accessibilityState).toEqual({ selected: true });

    await act(async () => {
      setWidth(390);
    });

    expect(view.getSegments()).toEqual(['(main)', '(home)']);
    expect(screen.queryByTestId('sidebar')).not.toBeOnTheScreen();
  });
});
