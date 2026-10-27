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

describe('UthmaniHighlightText', () => {
  it('outlines highlighted words by position', async () => {
    const view = await renderUi(
      <UthmaniHighlightText highlightedPositions={[1]} testID="uthmani-highlight" words={words} />,
    );

    const highlighted = view.getByText(/ٱلْحَمْدُ/);
    const plain = view.getByText(/لِلَّهِ/);
    expect(flatStyle(highlighted.props.style).borderWidth).toBe(1);
    expect(flatStyle(plain.props.style).borderWidth).toBeUndefined();
  });

  it('renders without highlight styling when positions are empty', async () => {
    const view = await renderUi(
      <UthmaniHighlightText highlightedPositions={[]} testID="uthmani-highlight" words={words} />,
    );

    expect(flatStyle(view.getByText(/ٱلْحَمْدُ/).props.style).borderWidth).toBeUndefined();
    expect(flatStyle(view.getByText(/لِلَّهِ/).props.style).borderWidth).toBeUndefined();
  });

  it.each(locales)('uses RTL writing direction (%s)', async (locale) => {
    const view = await renderUi(
      <UthmaniHighlightText highlightedPositions={[]} testID="uthmani-highlight" words={words} />,
      { locale },
    );

    expect(flatStyle(view.getByTestId('uthmani-highlight-body').props.style).writingDirection).toBe('rtl');
  });

  it('renders the words in the Reading Quran style, unscaled by the system text size', async () => {
    const view = await renderUi(
      <UthmaniHighlightText highlightedPositions={[]} testID="uthmani-highlight" words={words} />,
    );
    const body = view.getByTestId('uthmani-highlight-body');

    expect(flatStyle(body.props.style)).toMatchObject({
      ...quranText('quranReading'),
      color: themes.light.colors.ink,
    });
    expect(body.props.allowFontScaling).toBe(false);
  });

  it('keeps every word exactly as stored', async () => {
    const view = await renderUi(
      <UthmaniHighlightText highlightedPositions={[1]} testID="uthmani-highlight" words={words} />,
    );

    for (const word of words) {
      expect(view.getByText(word.textUthmani, { exact: false })).toBeOnTheScreen();
    }
  });

  it('does not expose its own accessibility label', async () => {
    const view = await renderUi(
      <UthmaniHighlightText highlightedPositions={[]} testID="uthmani-highlight" words={words} />,
    );

    const container = view.getByTestId('uthmani-highlight');
    expect(container.props.accessible).toBe(false);
    expect(container.props.accessibilityLabel).toBeUndefined();
    expect(container.props.importantForAccessibility).toBe('no');
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/search/components/UthmaniHighlightText.tsx')).toEqual([]);
  });
});
