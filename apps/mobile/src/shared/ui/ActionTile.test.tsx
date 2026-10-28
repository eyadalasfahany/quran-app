import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { ActionTile } from './ActionTile';

const play = { ios: 'play.fill', android: 'play_arrow' } as const;
const copy = { ios: 'doc.on.doc', android: 'content_copy' } as const;
const colors = themes.light.colors;

describe('ActionTile', () => {
  it('renders the default tile on surfaceRaised with a line border', async () => {
    const view = await renderUi(<ActionTile icon={copy} label="نسخ" onPress={() => undefined} />);
    const tile = view.getByRole('button', { name: 'نسخ' });

    expect(flatStyle(tile.props.style)).toMatchObject({
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.line,
    });
    expect(flatStyle(view.getByText('نسخ').props.style).color).toBe(colors.ink);
    expect(flatStyle(tile.props.style)).toMatchObject({ borderRadius: 16, gap: 6, paddingHorizontal: 2 });
    expect(flatStyle(view.getByText('نسخ').props.style).fontWeight).toBeUndefined();
  });

  it('sets the primary label at weight 600 and the default label at 500', async () => {
    const primary = await renderUi(
      <ActionTile icon={play} label="تشغيل" onPress={() => undefined} variant="primary" />,
    );
    const standard = await renderUi(<ActionTile icon={copy} label="نسخ" onPress={() => undefined} />);

    expect(flatStyle(primary.getByText('تشغيل').props.style).fontFamily).toBe('IBMPlexSansArabic-SemiBold');
    expect(flatStyle(standard.getByText('نسخ').props.style).fontFamily).toBe('IBMPlexSansArabic-Medium');
  });

  it('renders the primary tile in brandSurface and onBrandSurface', async () => {
    const view = await renderUi(
      <ActionTile icon={play} label="تشغيل من هنا" onPress={() => undefined} variant="primary" />,
    );

    expect(flatStyle(view.getByRole('button').props.style).backgroundColor).toBe(colors.brandSurface);
    expect(flatStyle(view.getByText('تشغيل من هنا').props.style).color).toBe(colors.onBrandSurface);
  });

  it('calls onPress', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<ActionTile icon={copy} label="Copy" onPress={onPress} />, { locale: 'en' });

    await fireEvent.press(view.getByRole('button', { name: 'Copy' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('disables the tile with a hint and ignores presses', async () => {
    const onPress = jest.fn();
    const view = await renderUi(
      <ActionTile accessibilityHint="Not yet" disabled icon={play} label="Play" onPress={onPress} variant="primary" />,
      { locale: 'en' },
    );
    const tile = view.getByRole('button', { name: 'Play' });

    await fireEvent.press(tile);

    expect(onPress).not.toHaveBeenCalled();
    expect(tile.props.accessibilityState).toMatchObject({ disabled: true });
    expect(tile.props.accessibilityHint).toBe('Not yet');
    expect(flatStyle(tile.props.style).opacity).toBeLessThan(1);
  });

  it('reports the selected state of a toggle tile', async () => {
    const view = await renderUi(<ActionTile icon={copy} label="Save" onPress={() => undefined} selected />, {
      locale: 'en',
    });

    expect(view.getByRole('button', { name: 'Save' }).props.accessibilityState).toEqual({
      disabled: false,
      selected: true,
    });
  });

  it.each(locales)('centres the label under the icon in %s', async (locale) => {
    const view = await renderUi(<ActionTile icon={copy} label="label" onPress={() => undefined} />, { locale });

    expect(flatStyle(view.getByText('label').props.style).textAlign).toBe('center');
    expect(flatStyle(view.getByRole('button').props.style).alignItems).toBe('center');
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('ActionTile.tsx')).toEqual([]);
  });
});
