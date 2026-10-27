import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { themes } from '@/core/theme';
import type { WordRecord } from '@/features/reader/data/words';
import { quranText } from '@/shared/ui';

import { UthmaniHighlightText } from './UthmaniHighlightText';

const words: WordRecord[] = [
  { verseId: 2, position: 1, charType: 'word', textUthmani: 'ٱلْحَمْدُ', textImlaei: 'الحمد' },
  { verseId: 2, position: 2, charType: 'word', textUthmani: 'لِلَّهِ', textImlaei: 'لله' },
  { verseId: 2, position: 3, charType: 'end', textUthmani: '٢', textImlaei: '٢' },
];

const hidden = { includeHiddenElements: true } as const;

describe('UthmaniHighlightText', () => {
  it('outlines matched words in brand, with no fill (ADR 0012)', async () => {
    const view = await renderUi(<UthmaniHighlightText highlightedPositions={[1]} testID="uthmani" words={words} />);

    expect(flatStyle(view.getByTestId('uthmani-match-1', hidden).props.style)).toMatchObject({
      borderColor: themes.light.colors.brand,
      borderWidth: themes.light.stroke.match,
    });
    expect(flatStyle(view.getByTestId('uthmani-match-1', hidden).props.style).backgroundColor).toBeUndefined();
    expect(view.queryByTestId('uthmani-match-2', hidden)).toBeNull();
  });

  it('draws nothing around words when nothing matched', async () => {
    const view = await renderUi(<UthmaniHighlightText highlightedPositions={[]} testID="uthmani" words={words} />);

    expect(view.queryByTestId(/uthmani-match/, hidden)).toBeNull();
  });

  it.each(locales)('lays the words out right to left in %s', async (locale) => {
    const view = await renderUi(<UthmaniHighlightText highlightedPositions={[]} testID="uthmani" words={words} />, {
      locale,
    });

    expect(flatStyle(view.getByTestId('uthmani', hidden).props.style)).toMatchObject({
      flexDirection: locale === 'ar' ? 'row' : 'row-reverse',
      flexWrap: 'wrap',
    });
  });

  it('sets each word in the result Quran style, unscaled by the system text size', async () => {
    const view = await renderUi(<UthmaniHighlightText highlightedPositions={[]} words={words} />);
    const word = view.getByText('لِلَّهِ', hidden);

    expect(flatStyle(word.props.style)).toMatchObject(quranText('quranResult'));
    expect(word.props.allowFontScaling).toBe(false);
  });

  it('keeps every word exactly as stored', async () => {
    const view = await renderUi(<UthmaniHighlightText highlightedPositions={[2]} words={words} />);

    for (const word of words) {
      expect(view.getByText(word.textUthmani, hidden).props.children).toBe(word.textUthmani);
    }
  });

  it('is hidden from screen readers; its row carries the label', async () => {
    const view = await renderUi(<UthmaniHighlightText highlightedPositions={[]} testID="uthmani" words={words} />);

    expect(view.getByTestId('uthmani', hidden).props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/search/components/UthmaniHighlightText.tsx')).toEqual([]);
  });
});
