import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { themes } from '@/core/theme';

import { ReciterFilterChip } from './ReciterFilterChip';

const colors = themes.light.colors;

describe('ReciterFilterChip', () => {
  it('is a 44 pt, 18 pt radius chip with the label at 13 pt', async () => {
    const view = await renderUi(
      <ReciterFilterChip label="الكل" onPress={() => undefined} selected={false} testID="chip" />,
    );

    expect(flatStyle(view.getByTestId('chip').props.style)).toMatchObject({
      borderRadius: 18,
      minHeight: 44,
      paddingHorizontal: 14,
    });
    expect(view.getByRole('radio', { name: 'الكل' }).props.accessibilityState).toEqual({
      checked: false,
      disabled: false,
    });
  });

  it('fills brand when selected and sits on a raised surface otherwise', async () => {
    const selected = await renderUi(
      <ReciterFilterChip label="الكل" onPress={() => undefined} selected testID="chip" />,
    );
    expect(flatStyle(selected.getByTestId('chip').props.style).backgroundColor).toBe(colors.brandSurface);
    expect(flatStyle(selected.getByText('الكل').props.style).color).toBe(colors.onBrandSurface);

    const idle = await renderUi(<ReciterFilterChip label="الكل" onPress={() => undefined} selected={false} testID="chip" />);
    expect(flatStyle(idle.getByTestId('chip').props.style).backgroundColor).toBe(colors.surfaceRaised);
  });

  it('calls onPress when enabled', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<ReciterFilterChip label="مرتّل" onPress={onPress} selected={false} />);

    await fireEvent.press(view.getByRole('radio', { name: 'مرتّل' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is disabled, dimmed and does not press when disabled', async () => {
    const onPress = jest.fn();
    const view = await renderUi(
      <ReciterFilterChip disabled label="المحمّلة" onPress={onPress} selected={false} testID="chip" />,
    );

    await fireEvent.press(view.getByRole('radio', { name: 'المحمّلة' }));

    expect(onPress).not.toHaveBeenCalled();
    expect(view.getByRole('radio', { name: 'المحمّلة' }).props.accessibilityState).toEqual({
      checked: false,
      disabled: true,
    });
    expect(flatStyle(view.getByTestId('chip').props.style).opacity).toBe(0.45);
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<ReciterFilterChip label="All" onPress={() => undefined} selected />, { locale });

    expect(view.getByRole('radio', { name: 'All' })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/audio/components/ReciterFilterChip.tsx')).toEqual([]);
  });
});
