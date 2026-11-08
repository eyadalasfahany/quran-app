import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { joinedChildrenText, PLACEHOLDER_TEXT, PLACEHOLDER_TEXT_MARKS, physicalSides } from '../../../../jest/hadith-ui-fixtures';
import { themes, uiFontFamilies } from '@/core/theme';
import { maxFontScale } from '@/shared/ui';

import { HadithText, quoteParts } from './HadithText';

const TEST_ID = 'hadith-text';
const CHAIN_TEXT = 'سند ثم متن';

describe('HadithText', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderUi(<HadithText text={PLACEHOLDER_TEXT} variant="preview" />, { locale });
    expect(screen.getByText(PLACEHOLDER_TEXT)).toBeOnTheScreen();
  });

  it('draws the reader at 24 over 48', async () => {
    await renderUi(<HadithText text={PLACEHOLDER_TEXT} variant="reader" />);
    expect(flatStyle(screen.getByTestId(TEST_ID).props.style)).toMatchObject({ fontSize: 24, lineHeight: 48 });
  });

  it('draws the preview at 19 over 36 and never 34', async () => {
    await renderUi(<HadithText text={PLACEHOLDER_TEXT} variant="preview" />);
    const style = flatStyle(screen.getByTestId(TEST_ID).props.style);
    expect(style).toMatchObject({ fontSize: 19, lineHeight: 36 });
    expect(style.lineHeight).not.toBe(34);
  });

  it('starts at the right, writes rtl in both languages, never justified or centred', async () => {
    for (const locale of locales) {
      const view = await renderUi(<HadithText text={PLACEHOLDER_TEXT} variant="preview" />, { locale });
      expect(flatStyle(screen.getByTestId(TEST_ID).props.style)).toMatchObject({ direction: 'ltr', textAlign: 'right', writingDirection: 'rtl' });
      await view.unmount();
    }
    await renderUi(<HadithText text={PLACEHOLDER_TEXT} variant="reader" />);
    expect(flatStyle(screen.getByTestId(TEST_ID).props.style).textAlign).not.toBe('center');
  });

  it('clamps the preview with numberOfLines and sets no height', async () => {
    await renderUi(<HadithText text={PLACEHOLDER_TEXT} variant="preview" />);
    const node = screen.getByTestId(TEST_ID);
    expect(node.props.numberOfLines).toBe(3);
    expect(flatStyle(node.props.style)).not.toHaveProperty('height');
  });

  it('draws one colour when chainEnd is null', async () => {
    await renderUi(<HadithText chainEnd={null} text={CHAIN_TEXT} variant="preview" />);
    expect(screen.queryByTestId(`${TEST_ID}-chain`)).toBeNull();
    expect(screen.getByText(CHAIN_TEXT)).toBeOnTheScreen();
  });

  it('draws the chain in brand and the rest in ink when chainEnd is inside the text', async () => {
    await renderUi(<HadithText chainEnd={4} text={CHAIN_TEXT} variant="preview" />);
    expect(flatStyle(screen.getByTestId(`${TEST_ID}-chain`).props.style).color).toBe(themes.light.colors.brand);
    expect(screen.getByTestId(`${TEST_ID}-chain`)).toHaveTextContent('سند');
  });

  it('joins the two spans back into the exact original string', async () => {
    await renderUi(<HadithText chainEnd={4} text={CHAIN_TEXT} variant="preview" />);
    expect(joinedChildrenText(screen.getByTestId(TEST_ID).props.children)).toBe(CHAIN_TEXT);
  });

  it.each([0, -1, CHAIN_TEXT.length, CHAIN_TEXT.length + 5, 2.5])('ignores a chainEnd of %p', async (chainEnd) => {
    await renderUi(<HadithText chainEnd={chainEnd} text={CHAIN_TEXT} variant="preview" />);
    expect(screen.queryByTestId(`${TEST_ID}-chain`)).toBeNull();
    expect(screen.getByTestId(TEST_ID).props.children).toBe(CHAIN_TEXT);
  });

  it('scales the reader with fontScale', async () => {
    await renderUi(<HadithText fontScale={1.5} text={PLACEHOLDER_TEXT} variant="reader" />);
    expect(flatStyle(screen.getByTestId(TEST_ID).props.style)).toMatchObject({ fontSize: 36, lineHeight: 72 });
  });

  it.each(['reader', 'preview'] as const)('draws quoted words in gold, marks included (%s)', async (variant) => {
    const text = 'نص "قول" نص "قول آخر"';
    await renderUi(<HadithText text={text} variant={variant} />);
    const quotes = screen.getAllByTestId(`${TEST_ID}-quote`);
    expect(quotes.map((quote) => quote.props.children)).toEqual(['"قول"', '"قول آخر"']);
    expect(flatStyle(quotes[0]!.props.style).color).toBe(themes.light.colors.gold);
    expect(joinedChildrenText(screen.getByTestId(TEST_ID).props.children)).toBe(text);
  });

  it.each(['نص "قول نص', 'نص بلا علامات', 'نص "أ" "ب'])('leaves %p plain', async (text) => {
    await renderUi(<HadithText text={text} variant="reader" />);
    expect(screen.queryByTestId(`${TEST_ID}-quote`)).toBeNull();
    expect(screen.getByTestId(TEST_ID).props.children).toBe(text);
  });

  it('colours quotes after the chain, never inside it', async () => {
    const text = 'سند ثم "متن"';
    await renderUi(<HadithText chainEnd={4} text={text} variant="preview" />);
    expect(screen.getByTestId(`${TEST_ID}-chain`)).toHaveTextContent('سند');
    expect(screen.getByTestId(`${TEST_ID}-quote`).props.children).toBe('"متن"');
    expect(joinedChildrenText(screen.getByTestId(TEST_ID).props.children)).toBe(text);
  });

  it.each(['reader', 'preview'] as const)('uses the tafsir body face, not Amiri (%s)', async (variant) => {
    await renderUi(<HadithText text={PLACEHOLDER_TEXT} variant={variant} />);
    expect(flatStyle(screen.getByTestId(TEST_ID).props.style).fontFamily).toBe(uiFontFamilies[400]);
  });

  it('keeps every character when splitting', () => {
    const text = '"أ"ب"ج"';
    expect(quoteParts(text).map((part) => part.text).join('')).toBe(text);
  });

  it('passes the stored text through byte for byte', async () => {
    await renderUi(<HadithText text={PLACEHOLDER_TEXT_MARKS} variant="preview" />);
    expect(screen.getByTestId(TEST_ID).props.children).toBe(PLACEHOLDER_TEXT_MARKS);
  });

  it('uses start and end, never left and right', async () => {
    await renderUi(<HadithText text={PLACEHOLDER_TEXT} variant="reader" />);
    expect(physicalSides(flatStyle(screen.getByTestId(TEST_ID).props.style))).toEqual([]);
  });

  it('exposes Arabic as the accessibility language', async () => {
    await renderUi(<HadithText text={PLACEHOLDER_TEXT} variant="preview" />, { locale: 'en' });
    expect(screen.getByTestId(TEST_ID).props.accessibilityLanguage).toBe('ar');
  });

  it.each(['light', 'sepia', 'dark'] as const)('reads its colours from the theme (%s)', async (theme) => {
    await renderUi(<HadithText text={PLACEHOLDER_TEXT} variant="preview" />, { theme });
    expect(flatStyle(screen.getByTestId(TEST_ID).props.style).color).toBe(themes[theme].colors.ink);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithText.tsx')).toEqual([]);
  });

  it('keeps text scalable and unclipped at the largest size', async () => {
    await renderUi(<HadithText text={PLACEHOLDER_TEXT} variant="preview" />);
    expect(screen.getByTestId(TEST_ID).props.maxFontSizeMultiplier).toBe(maxFontScale.content);
  });
});
