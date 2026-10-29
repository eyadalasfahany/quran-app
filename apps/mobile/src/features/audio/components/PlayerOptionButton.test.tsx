import { fireEvent } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import { PlayerOptionButton } from './PlayerOptionButton';

jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SymbolView: () => createElement(View, {} as ComponentProps<typeof View>) };
});

const repeat = { ios: 'repeat', android: 'repeat' } as const;
const colors = themes.dark.colors;

describe('PlayerOptionButton', () => {
  it('shows its label in the player ink at weight 500 when inactive', async () => {
    const view = await renderUi(
      <PlayerOptionButton accessibilityLabel="عدد مرات التكرار" icon={repeat} label="تكرار" onPress={() => undefined} />,
      { theme: 'dark' },
    );
    const label = view.getByText('تكرار');

    expect(flatStyle(label.props.style)).toMatchObject({ color: colors.playerInk, fontFamily: 'IBMPlexSansArabic-Medium' });
    expect(view.getByRole('button', { name: 'عدد مرات التكرار' }).props.accessibilityState).toEqual({
      disabled: false,
      selected: false,
    });
  });

  it('draws the active item in the player accent at weight 600 and reports it selected', async () => {
    const view = await renderUi(
      <PlayerOptionButton accessibilityLabel="a" active icon={repeat} label="تكرار ٣×" onPress={() => undefined} />,
      { theme: 'dark' },
    );

    expect(flatStyle(view.getByText('تكرار ٣×').props.style)).toMatchObject({
      color: colors.playerAccent,
      fontFamily: 'IBMPlexSansArabic-SemiBold',
    });
    expect(view.getByRole('button').props.accessibilityState).toEqual({ disabled: false, selected: true });
  });

  it('keeps every item at least 44 pt tall, with a 12 pt label', async () => {
    const view = await renderUi(<PlayerOptionButton accessibilityLabel="a" icon={repeat} label="x" onPress={() => undefined} />);

    expect(flatStyle(view.getByRole('button').props.style).minHeight).toBeGreaterThanOrEqual(44);
    expect(flatStyle(view.getByText('x').props.style).fontSize).toBe(12);
  });

  it('reports disabled and ignores presses when disabled', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<PlayerOptionButton accessibilityLabel="a" disabled icon={repeat} label="x" onPress={onPress} />);
    const button = view.getByRole('button');

    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/PlayerOptionButton.tsx')).toEqual([]);
  });
});
