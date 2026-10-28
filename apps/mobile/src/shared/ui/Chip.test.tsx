import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { Chip } from './Chip';

const colors = themes.light.colors;

describe('Chip', () => {
  it('renders an unselected button chip by default', async () => {
    const view = await renderUi(<Chip label="الكل" onPress={() => undefined} selected={false} />);
    const chip = view.getByRole('button', { name: 'الكل' });

    expect(chip.props.accessibilityState).toMatchObject({ selected: false });
    expect(flatStyle(chip.props.style)).toMatchObject({
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.line,
    });
    expect(flatStyle(chip.props.style).minHeight).toBeGreaterThanOrEqual(44);
  });

  it('fills a selected chip with brandSurface', async () => {
    const view = await renderUi(<Chip caption="مختصر" label="الميسر" onPress={() => undefined} selected />);

    expect(flatStyle(view.getByRole('button').props.style).backgroundColor).toBe(colors.brandSurface);
    expect(flatStyle(view.getByText('الميسر').props.style).color).toBe(colors.onBrandSurface);
    expect(flatStyle(view.getByText('مختصر').props.style)).toMatchObject({
      color: colors.onBrandSurface,
      opacity: 0.8,
    });
  });

  it('is a radio with a checked state in a single-choice group', async () => {
    const view = await renderUi(<Chip label="ابن كثير" onPress={() => undefined} role="radio" selected />);

    expect(view.getByRole('radio', { name: 'ابن كثير' }).props.accessibilityState).toMatchObject({ checked: true });
  });

  it('reads its caption after the label', async () => {
    const view = await renderUi(
      <Chip caption="long" label="Ibn Kathir" onPress={() => undefined} role="radio" selected={false} />,
      { locale: 'en' },
    );

    expect(view.getByRole('radio', { name: 'Ibn Kathir, long' }).props.accessibilityState).toMatchObject({
      checked: false,
    });
    expect(flatStyle(view.getByText('long').props.style)).toMatchObject({ color: colors.ink, opacity: 0.8 });
  });

  it.each([
    ['sheet', 19],
    ['panel', 22],
  ] as const)('rounds the %s chip to radius %s, with the frame padding and inner gap', async (layout, radius) => {
    const view = await renderUi(<Chip label="ابن كثير" layout={layout} onPress={jest.fn()} selected={false} testID="chip" />);

    expect(flatStyle(view.getByTestId('chip').props.style)).toMatchObject({
      borderRadius: radius,
      paddingHorizontal: 14,
    });
  });

  it('draws the caption in the label colour at 0.8 opacity, in both states', async () => {
    const unselected = await renderUi(<Chip caption="مختصر" label="الميسر" onPress={jest.fn()} selected={false} />);
    const caption = unselected.getByText('مختصر');
    expect(flatStyle(caption.props.style).opacity).toBe(0.8);
    expect(flatStyle(caption.props.style).color).toBe(colors.ink);

    const selected = await renderUi(<Chip caption="مختصر" label="الميسر" onPress={jest.fn()} selected />);
    expect(flatStyle(selected.getByText('مختصر').props.style)).toMatchObject({
      color: colors.onBrandSurface,
      opacity: 0.8,
    });
  });

  it('calls onPress', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<Chip label="السور" onPress={onPress} selected={false} />);

    await fireEvent.press(view.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('lays label and caption in a logical row (%s)', async (locale) => {
    const view = await renderUi(<Chip caption="c" label="l" onPress={() => undefined} selected={false} />, { locale });

    expect(flatStyle(view.getByRole('button').props.style)).toMatchObject({
      flexDirection: 'row',
      paddingHorizontal: 14,
    });
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('Chip.tsx')).toEqual([]);
  });
});
