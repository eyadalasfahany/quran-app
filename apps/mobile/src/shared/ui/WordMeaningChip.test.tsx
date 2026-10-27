import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { WordMeaningChip } from './WordMeaningChip';

// Uthmani with superscript alef, tatweel and combining marks: any normalisation would change the bytes.
const word = 'ٱلْعَـٰلَمِينَ';

function bytes(text: string): number[] {
  return Array.from(new TextEncoder().encode(text));
}

describe('WordMeaningChip', () => {
  it('renders the word byte for byte in Amiri Quran', async () => {
    const view = await renderUi(<WordMeaningChip meaning="of the worlds" testID="chip" word={word} />);
    const rendered = view.getByTestId('chip-word');

    expect(bytes(rendered.props.children as string)).toEqual(bytes(word));
    expect(flatStyle(rendered.props.style)).toMatchObject({ fontFamily: 'AmiriQuran', fontSize: 20 });
    expect(flatStyle(rendered.props.style).fontWeight).toBeUndefined();
    expect(rendered.props.allowFontScaling).toBe(false);
  });

  it('scales the word with the reader font scale', async () => {
    const view = await renderUi(<WordMeaningChip fontScale={1.6} meaning="Lord" testID="chip" word="رَبِّ" />);

    expect(flatStyle(view.getByTestId('chip-word').props.style).fontSize).toBe(32);
  });

  it('renders an English meaning left to right in muted ink', async () => {
    const view = await renderUi(<WordMeaningChip meaning="All praise" testID="chip" word="ٱلْحَمْدُ" />);

    expect(flatStyle(view.getByTestId('chip-meaning').props.style)).toMatchObject({
      color: themes.light.colors.inkMuted,
      writingDirection: 'ltr',
    });
  });

  it('renders a right-to-left meaning when asked', async () => {
    const view = await renderUi(
      <WordMeaningChip meaning="الثناء" meaningDirection="rtl" testID="chip" word="ٱلْحَمْدُ" />,
    );

    expect(flatStyle(view.getByTestId('chip-meaning').props.style).writingDirection).toBe('rtl');
  });

  it('reads the word and its meaning together', async () => {
    const view = await renderUi(<WordMeaningChip meaning="to Allah" testID="chip" word="لِلَّهِ" />);

    expect(view.getByTestId('chip').props.accessibilityLabel).toBe('لِلَّهِ, to Allah');
    expect(view.getByTestId('chip').props.accessible).toBe(true);
    expect(view.getByTestId('chip-word').props.accessible).toBe(false);
    expect(view.getByTestId('chip-word').props.importantForAccessibility).toBe('no');
    expect(view.getByTestId('chip-meaning').props.accessible).toBe(false);
    expect(view.getByTestId('chip-meaning').props.importantForAccessibility).toBe('no');
  });

  it.each(locales)('keeps the word right to left whatever the interface direction (%s)', async (locale) => {
    const view = await renderUi(<WordMeaningChip meaning="m" testID="chip" word={word} />, { locale });

    expect(flatStyle(view.getByTestId('chip-word').props.style).writingDirection).toBe('rtl');
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('WordMeaningChip.tsx')).toEqual([]);
  });
});
