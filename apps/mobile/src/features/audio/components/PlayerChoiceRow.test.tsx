import { fireEvent } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import { PlayerChoiceRow } from './PlayerChoiceRow';

jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SymbolView: () => createElement(View, {} as ComponentProps<typeof View>) };
});

const colors = themes.dark.colors;

describe('PlayerChoiceRow', () => {
  it.each(locales)('shows its label as a radio, unchecked, in %s', async (locale) => {
    const view = await renderUi(<PlayerChoiceRow label="١٫٢٥×" onPress={() => undefined} />, { locale, theme: 'dark' });
    const row = view.getByRole('radio', { name: '١٫٢٥×' });

    expect(row.props.accessibilityState).toEqual({ checked: false, disabled: false });
    expect(flatStyle(view.getByText('١٫٢٥×').props.style)).toMatchObject({
      color: colors.playerInk,
      fontFamily: 'IBMPlexSansArabic-Regular',
    });
    expect(view.queryByTestId('row-check')).toBeNull();
  });

  it('shows the check mark and the accent at weight 600 when checked', async () => {
    const view = await renderUi(
      <PlayerChoiceRow checked label="1×" onPress={() => undefined} testID="row" />,
      { theme: 'dark' },
    );

    expect(view.getByRole('radio').props.accessibilityState).toMatchObject({ checked: true });
    expect(flatStyle(view.getByText('1×').props.style)).toMatchObject({ fontFamily: 'IBMPlexSansArabic-SemiBold' });
    expect(view.getByTestId('row-check', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('is disabled and ignores presses when disabled', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<PlayerChoiceRow disabled label="x" onPress={onPress} />, { theme: 'dark' });
    const row = view.getByRole('radio');

    expect(row.props.accessibilityState).toMatchObject({ disabled: true });
    expect(flatStyle(view.getByText('x').props.style).color).toBe(colors.playerMuted);
    fireEvent.press(row);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<PlayerChoiceRow label="1.5×" onPress={onPress} />);

    fireEvent.press(view.getByRole('radio', { name: '1.5×' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('keeps every row at least 44 pt tall', async () => {
    const view = await renderUi(<PlayerChoiceRow label="x" onPress={() => undefined} />);

    expect(flatStyle(view.getByRole('radio').props.style).minHeight).toBeGreaterThanOrEqual(44);
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/PlayerChoiceRow.tsx')).toEqual([]);
  });
});
