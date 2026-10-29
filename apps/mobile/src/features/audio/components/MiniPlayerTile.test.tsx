import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { displayFontFamilies, themes } from '@/core/theme';

import { MiniPlayerTile } from './MiniPlayerTile';

const colors = themes.light.colors;
// The tile is hidden from screen readers, so every query asks for hidden elements.
const hidden = { includeHiddenElements: true };

describe('MiniPlayerTile', () => {
  it('draws the letter in Amiri 22 at weight 700 on a fillSecondary tile', async () => {
    const view = await renderUi(<MiniPlayerTile glyph="brand" letter="ع" radius={14} size={44} />);
    const tile = flatStyle(view.getByTestId('mini-player-tile', hidden).props.style);
    const letter = flatStyle(view.getByText('ع', hidden).props.style);

    expect(tile.backgroundColor).toBe(colors.fillSecondary);
    expect(letter.fontFamily).toBe(displayFontFamilies[700]);
    expect(letter.fontSize).toBe(22);
  });

  it('takes the size and radius it is given', async () => {
    const view = await renderUi(<MiniPlayerTile glyph="ink" letter="ع" radius={12} size={46} />);

    expect(flatStyle(view.getByTestId('mini-player-tile', hidden).props.style)).toMatchObject({
      borderRadius: 12,
      height: 46,
      width: 46,
    });
  });

  it('draws the letter in brand for the tab variant', async () => {
    const view = await renderUi(<MiniPlayerTile glyph="brand" letter="ع" radius={14} size={44} />);

    expect(flatStyle(view.getByText('ع', hidden).props.style).color).toBe(colors.brand);
  });

  it('draws the letter in ink for the reader variant', async () => {
    const view = await renderUi(<MiniPlayerTile glyph="ink" letter="ع" radius={12} size={46} />);

    expect(flatStyle(view.getByText('ع', hidden).props.style).color).toBe(colors.ink);
  });

  it("is hidden from screen readers, because the reciter's name carries the label", async () => {
    const view = await renderUi(<MiniPlayerTile glyph="brand" letter="ع" radius={14} size={44} />);
    const tile = view.getByTestId('mini-player-tile', hidden);

    expect(tile.props.accessibilityElementsHidden).toBe(true);
    expect(tile.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it.each(locales)('renders in %s', async (locale) => {
    const view = await renderUi(<MiniPlayerTile glyph="brand" letter="M" radius={14} size={44} />, { locale });

    expect(view.getByText('M', hidden)).toBeOnTheScreen();
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/MiniPlayerTile.tsx')).toEqual([]);
  });
});
