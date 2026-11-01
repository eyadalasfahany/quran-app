import { act, fireEvent } from '@testing-library/react-native';

import { themes } from '@/core/theme';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';

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

/** Fires the probe widths (every token 100 wide), then the Text's single line that spans the whole text. */
function measure(view: Awaited<ReturnType<typeof renderUi>>, text: string) {
  const probes = view.queryAllByTestId(/^q-probe-/, { includeHiddenElements: true });
  for (const probe of probes) {
    fireEvent(probe, 'layout', { nativeEvent: { layout: { height: 20, width: 100, x: 0, y: 0 } } });
  }
  fireEvent(view.getByTestId('q'), 'textLayout', {
    nativeEvent: { lines: [{ ascender: 35, descender: -10, height: 50, text, width: 400, x: 0, y: 0 }] },
  });
}

describe('RecitedQuranText with wordMotion pill', () => {
  it('keeps the span marking as the fallback until the positions are measured', async () => {
    const view = await renderUi(<RecitedQuranText activeWord={1} testID="q" text={TEXT} variant="quranReading" wordMotion="pill" />);
    expect(view.queryByTestId('q-pill', { includeHiddenElements: true })).toBeNull();
    expect(flatStyle(view.getByTestId('q-word').props.style)).toMatchObject({ backgroundColor: colors.brandSurface });
  });

  it.each(locales)('draws the pill behind the text once measured, with no span wash (%s)', async (locale) => {
    const view = await renderUi(<RecitedQuranText activeWord={1} testID="q" text={TEXT} variant="quranReading" wordMotion="pill" />, { locale });
    await act(async () => {
      measure(view, TEXT);
    });

    expect(view.getByTestId('q-pill', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(flatStyle(view.getByTestId('q-word').props.style).backgroundColor).toBeUndefined();
    expect(flatStyle(view.getByTestId('q-word').props.style)).toMatchObject({ color: colors.onBrandSurface });
    expect(view.getByTestId('q-word')).toHaveTextContent('بِسْمِ');
  });

  it('keeps the Quran text as one Text, byte for byte', async () => {
    const view = await renderUi(<RecitedQuranText activeWord={2} testID="q" text={TEXT} variant="quranReading" wordMotion="pill" />);
    await act(async () => {
      measure(view, TEXT);
    });
    expect(view.getByText(TEXT)).toBeOnTheScreen();
  });

  it('still calls the caller\'s onTextLayout with the same event', async () => {
    const onTextLayout = jest.fn();
    const view = await renderUi(
      <RecitedQuranText activeWord={1} onTextLayout={onTextLayout} testID="q" text={TEXT} variant="quranReading" wordMotion="pill" />,
    );
    await act(async () => {
      measure(view, TEXT);
    });
    expect(onTextLayout).toHaveBeenCalledTimes(1);
    expect(onTextLayout.mock.calls[0][0].nativeEvent.lines[0].width).toBe(400);
  });

  it('moves a Focus-style background to the wrapper, not the Text', async () => {
    const view = await renderUi(
      <RecitedQuranText
        activeWord={1}
        style={{ backgroundColor: colors.highlightActive }}
        testID="q"
        text={TEXT}
        variant="quranFocus"
        wordMotion="pill"
      />,
    );
    await act(async () => {
      measure(view, TEXT);
    });
    expect(flatStyle(view.getByTestId('q', { includeHiddenElements: true }).props.style).backgroundColor).toBeUndefined();
    const wrapper = view.getByTestId('q-pill', { includeHiddenElements: true }).parent;
    expect(flatStyle(wrapper?.props.style).backgroundColor).toBe(colors.highlightActive);
  });

  it('ignores the pill when there is no word position', async () => {
    const view = await renderUi(<RecitedQuranText activeWord={null} testID="q" text={TEXT} variant="quranReading" wordMotion="pill" />);
    expect(view.getByText(TEXT)).toBeOnTheScreen();
    expect(view.queryByTestId('q-pill', { includeHiddenElements: true })).toBeNull();
  });

  it('keeps the span default unchanged when wordMotion is not set', async () => {
    const view = await renderUi(<RecitedQuranText activeWord={1} testID="q" text={TEXT} variant="quranReading" />);
    expect(view.queryByTestId('q-pill', { includeHiddenElements: true })).toBeNull();
    expect(flatStyle(view.getByTestId('q-word').props.style).backgroundColor).toBe(colors.brandSurface);
  });
});

