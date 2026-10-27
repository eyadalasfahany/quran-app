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
    expect(flatStyle(view.getByText('مختصر').props.style).color).toBe(colors.onBrandSurfaceMuted);
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
    expect(flatStyle(view.getByText('long').props.style).color).toBe(colors.inkMuted);
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
      paddingHorizontal: themes.light.space[4],
    });
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('Chip.tsx')).toEqual([]);
  });
});
