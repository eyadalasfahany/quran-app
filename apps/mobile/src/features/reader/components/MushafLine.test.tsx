import { fireEvent } from '@testing-library/react-native';

import { themes } from '@/core/theme';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { MushafLine } from './MushafLine';
import { GLYPH_AL_FATIHA_1, GLYPH_END_1 } from '../mushaf/__fixtures__/mushaf-pages.fixture';

const words = [
  { wordId: 1, verseId: 42, positionInVerse: 1, charType: 'word', glyph: GLYPH_AL_FATIHA_1, positionInLine: 1 },
  { wordId: 2, verseId: 42, positionInVerse: 2, charType: 'end', glyph: GLYPH_END_1, positionInLine: 2 },
];

describe('MushafLine', () => {
  it('renders glyphs byte-for-byte and resolves presses to verse_id', async () => {
    const onPress = jest.fn();
    const view = await renderUi(
      <MushafLine
        fontFamily="qcf-v2-p1"
        fontSize={20}
        lineHeight={32}
        onVersePress={onPress}
        testID="line"
        words={words}
      />,
    );

    expect(view.getByText(GLYPH_AL_FATIHA_1)).toBeOnTheScreen();
    fireEvent.press(view.getByText(GLYPH_AL_FATIHA_1));
    expect(onPress).toHaveBeenCalledWith(42);
  });

  it('draws the brand margin rule for the active ayah', async () => {
    const view = await renderUi(
      <MushafLine activeVerseId={42} fontFamily="qcf-v2-p1" fontSize={20} lineHeight={32} testID="line" words={words} />,
    );
    expect(flatStyle(view.getByTestId('line').props.style).borderStartWidth).toBe(3);
  });

  it('never recolours the ayah marker glyph', async () => {
    const view = await renderUi(
      <MushafLine activeVerseId={42} fontFamily="qcf-v2-p1" fontSize={20} highlightByVerse={new Map([[42, 'gold']])} lineHeight={32} words={words} />,
    );
    const marker = view.getByText(GLYPH_END_1);
    expect(flatStyle(marker.props.style).backgroundColor).toBeUndefined();
  });

  it.each(locales)('mirrors the margin rule in %s', async (locale) => {
    const view = await renderUi(
      <MushafLine activeVerseId={42} fontFamily="qcf-v2-p1" fontSize={20} lineHeight={32} testID="line" words={words} />,
      { locale },
    );
    expect(flatStyle(view.getByTestId('line').props.style).borderStartWidth).toBe(3);
  });

  it('paints glyphs with the dark ink, not black', async () => {
    const view = await renderUi(
      <MushafLine fontFamily="qcf-v2-p1" fontSize={20} lineHeight={32} words={words} />,
      { theme: 'dark' },
    );
    expect(flatStyle(view.getByText(GLYPH_AL_FATIHA_1).props.style).color).toBe(themes.dark.colors.ink);
    expect(flatStyle(view.getByText(GLYPH_END_1).props.style).color).toBe(themes.dark.colors.ink);
  });

  it('uses theme tokens only', () => {
    expect(featureComponentLiterals('features/reader/components/MushafLine.tsx')).toEqual([]);
  });
});
