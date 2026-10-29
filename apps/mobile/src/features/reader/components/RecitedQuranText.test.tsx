import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { themes } from '@/core/theme';

import { RecitedQuranText, splitRecitedText } from './RecitedQuranText';

const colors = themes.light.colors;
const TEXT = 'بِسْمِ ٱللَّهِ  ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

describe('splitRecitedText', () => {
  it('does not count a waqf mark or ۞ standing as its own token, and keeps every byte', () => {
    // 2:2 in Tanzil's Uthmani text: the small high three dots (U+06DB) stand between the words.
    const text = 'ذَٰلِكَ ٱلْكِتَٰبُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِّلْمُتَّقِينَ';
    const pieces = splitRecitedText(text, 5);

    expect(pieces.find((piece) => piece.recited)?.text).toBe('فِيهِ');
    expect(pieces.map((piece) => piece.text).join('')).toBe(text);
  });

  it('keeps every character of the text when joined back', () => {
    const pieces = splitRecitedText(TEXT, 2);
    expect(pieces.map((piece) => piece.text).join('')).toBe(TEXT);
  });

  it('marks the word at the 1-based position among the words, not among the separators', () => {
    const recited = splitRecitedText(TEXT, 2).filter((piece) => piece.recited);
    expect(recited).toEqual([{ recited: true, separator: false, text: 'ٱللَّهِ' }]);
  });

  it('marks nothing when the position is past the last word', () => {
    expect(splitRecitedText(TEXT, 9).some((piece) => piece.recited)).toBe(false);
  });
});

describe('RecitedQuranText', () => {
  it('draws the text whole when there is no word position', async () => {
    const view = await renderUi(<RecitedQuranText activeWord={null} testID="q" text={TEXT} variant="quranReading" />);
    expect(view.getByText(TEXT)).toBeOnTheScreen();
    expect(view.queryByTestId('q-word')).toBeNull();
  });

  it.each(locales)('highlights the recited word on the brand surface (%s)', async (locale) => {
    const view = await renderUi(<RecitedQuranText activeWord={1} testID="q" text={TEXT} variant="quranReading" />, { locale });
    const word = view.getByTestId('q-word');
    expect(flatStyle(word.props.style)).toMatchObject({
      backgroundColor: colors.brandSurface,
      color: colors.onBrandSurface,
    });
    expect(word).toHaveTextContent('بِسْمِ');
  });
});
