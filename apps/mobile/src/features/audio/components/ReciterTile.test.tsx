import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { themes } from '@/core/theme';

import { ReciterTile } from './ReciterTile';

const colors = themes.light.colors;

describe('ReciterTile', () => {
  it('draws the letter on a fill tile when the reciter is not selected', async () => {
    const view = await renderUi(<ReciterTile letter="ع" selected={false} testID="tile" />);
    const tile = flatStyle(view.getByTestId('tile', { includeHiddenElements: true }).props.style);

    expect(tile).toMatchObject({ backgroundColor: colors.fillSecondary, height: 46, width: 46, borderRadius: 14 });
    expect(flatStyle(view.getByText('ع', { includeHiddenElements: true }).props.style)).toMatchObject({ color: colors.brand, fontSize: 22 });
  });

  it('fills the tile in brand when the reciter is selected', async () => {
    const view = await renderUi(<ReciterTile letter="ع" selected testID="tile" />);

    expect(flatStyle(view.getByTestId('tile', { includeHiddenElements: true }).props.style).backgroundColor).toBe(colors.brandSurface);
    expect(flatStyle(view.getByText('ع', { includeHiddenElements: true }).props.style).color).toBe(colors.onBrandSurface);
  });

  it.each(locales)('is decorative and hidden from screen readers (%s)', async (locale) => {
    const view = await renderUi(<ReciterTile letter="ع" selected={false} testID="tile" />, { locale });
    const tile = view.getByTestId('tile', { includeHiddenElements: true });

    expect(tile.props.accessibilityElementsHidden).toBe(true);
    expect(tile.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/audio/components/ReciterTile.tsx')).toEqual([]);
  });
});
