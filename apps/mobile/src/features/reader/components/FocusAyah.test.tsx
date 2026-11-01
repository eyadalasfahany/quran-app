import { act, fireEvent } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import { i18n } from '@/core/i18n';
import { ThemeProvider , themes } from '@/core/theme';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { FOCUS_FIT_MIN, FocusAyah, nextFocusFit } from './FocusAyah';

function setWindow(width: number, height: number) {
  Dimensions.set({
    screen: { fontScale: 1, height, scale: 1, width },
    window: { fontScale: 1, height, scale: 1, width },
  });
}

afterEach(() => {
  setWindow(390, 844);
});

const ayah = {
  textImlaei: 'إياك نعبد وإياك نستعين',
  textUthmani: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
  verseNumber: 5,
} as const;

describe('FocusAyah', () => {
  it.each(locales)('centres the ayah exactly as stored in its Quran font (%s)', async (locale) => {
    const view = await renderUi(<FocusAyah {...ayah} testID="focus" />, { locale });

    const text = view.getByTestId('focus-current');
    expect(text.props.children).toBe(ayah.textUthmani);
    expect(text.props.allowFontScaling).toBe(false);
    expect(flatStyle(text.props.style)).toMatchObject({
      color: themes.light.colors.ink,
      fontSize: 38,
      lineHeight: 80,
      textAlign: 'center',
      writingDirection: 'rtl',
    });
  });

  it('follows the reader font scale', async () => {
    const view = await renderUi(<FocusAyah {...ayah} fontScale={1.5} testID="focus" />);

    expect(flatStyle(view.getByTestId('focus-current').props.style)).toMatchObject({ fontSize: 57, lineHeight: 120 });
  });

  it('draws the active Focus marker at its size', async () => {
    const view = await renderUi(<FocusAyah {...ayah} testID="focus" />);
    const [mark] = view.getByTestId('focus-marker').children;

    expect(flatStyle(typeof mark === 'object' ? mark.props.style : undefined)).toMatchObject({
      color: themes.light.colors.brand,
      fontSize: themes.light.size.focusMarker,
    });
  });

  it.each(locales)('labels the ayah with its Imla\'i text and number (%s)', async (locale) => {
    const view = await renderUi(<FocusAyah {...ayah} testID="focus" />, { locale });

    const label = locale === 'ar' ? 'إياك نعبد وإياك نستعين الآية ٥' : 'إياك نعبد وإياك نستعين Ayah 5';
    expect(view.getByLabelText(label).props.accessibilityRole).toBe('text');
  });

  it('fills the ayah text with the reader highlight and names its colour in the label', async () => {
    const view = await renderUi(<FocusAyah {...ayah} highlightColor="blue" testID="focus" />);

    expect(flatStyle(view.getByTestId('focus-current').props.style).backgroundColor).toBe(
      themes.light.colors.highlightBlue,
    );
    expect(view.getByLabelText(`${ayah.textImlaei} ${i18n.t('ui.ayahNumber', { number: '٥' })} ${i18n.t('ui.highlight.blue')}`)).toBeOnTheScreen();
  });

  it('leaves the ayah text unfilled without a highlight', async () => {
    const view = await renderUi(<FocusAyah {...ayah} testID="focus" />);

    expect(flatStyle(view.getByTestId('focus-current').props.style).backgroundColor).toBeUndefined();
  });

  it('opens ayah actions from the marker', async () => {
    const onOpenActions = jest.fn();
    const view = await renderUi(<FocusAyah {...ayah} onOpenActions={onOpenActions} testID="focus" />);

    const marker = view.getByTestId('focus-marker');
    expect(marker.props.accessibilityRole).toBe('button');
    await fireEvent.press(marker);
    expect(onOpenActions).toHaveBeenCalledTimes(1);
  });

  it('leaves the marker as plain text without an actions handler', async () => {
    const view = await renderUi(<FocusAyah {...ayah} testID="focus" />);

    expect(view.getByTestId('focus-marker').props.accessibilityRole).toBe('text');
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/reader/components/FocusAyah.tsx')).toEqual([]);
  });
});

describe('FocusAyah recitation', () => {
  const props = { textImlaei: 'text', textUthmani: 'ٱللَّهُ لَآ', verseNumber: 255 };

  it('the recited ayah gets the neutral wash and says it is being recited', async () => {
    const view = await renderUi(<FocusAyah {...props} recited />);
    expect(flatStyle(view.getByTestId('focus-ayah-current').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.highlightActive,
    });
    expect(view.getByTestId('focus-ayah-current').props.accessibilityHint).toBe('يُتلى الآن');
  });

  it('a user colour fills the recited ayah instead of the wash', async () => {
    const view = await renderUi(<FocusAyah {...props} highlightColor="blue" recited />);
    expect(flatStyle(view.getByTestId('focus-ayah-current').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.highlightBlue,
    });
  });

  it('an ayah that is not recited has no wash', async () => {
    const view = await renderUi(<FocusAyah {...props} />);
    expect(flatStyle(view.getByTestId('focus-ayah-current').props.style).backgroundColor).toBeUndefined();
  });
});

describe('nextFocusFit', () => {
  it('keeps the size of an ayah block that fits, or with no stage height to fit', () => {
    expect(nextFocusFit(1, 200, 300)).toBe(1);
    expect(nextFocusFit(0.8, 300, 300)).toBe(0.8);
    expect(nextFocusFit(1, 500, Number.NaN)).toBe(1);
  });

  it('steps down by at least one step, and by the size the height suggests when that is further', () => {
    expect(nextFocusFit(1, 301, 300)).toBe(0.95);
    expect(nextFocusFit(1, 400, 300)).toBe(0.75);
    expect(nextFocusFit(1, 600, 300)).toBe(0.6);
  });

  it('never goes below the minimum', () => {
    expect(nextFocusFit(FOCUS_FIT_MIN, 5000, 300)).toBe(FOCUS_FIT_MIN);
    expect(nextFocusFit(0.62, 5000, 300)).toBe(FOCUS_FIT_MIN);
  });
});

describe('FocusAyah fit', () => {
  const props = { textImlaei: 'text', textUthmani: 'ٱللَّهُ لَآ', verseNumber: 255 };
  const sizeOf = (view: Awaited<ReturnType<typeof renderUi>>) =>
    flatStyle(view.getByTestId('focus-current').props.style).fontSize as number;

  it('leaves the reader size alone when there is no stage height', async () => {
    const view = await renderUi(<FocusAyah {...props} testID="focus" />);
    expect(sizeOf(view)).toBe(38);
  });

  it('shrinks step by step until the block fits the stage, and stays at or above the minimum', async () => {
    const view = await renderUi(<FocusAyah {...props} fitHeight={300} testID="focus" />);

    // A block ten times as tall as its font: it fits only at 30 pt or less.
    for (let pass = 0; pass < 12; pass += 1) {
      const size = sizeOf(view);
      await act(async () => {
        view.getByTestId('focus-block').props.onLayout({ nativeEvent: { layout: { height: size * 10, width: 360 } } });
      });
    }
    const size = sizeOf(view);
    expect(size).toBeLessThan(38);
    expect(size * 10).toBeLessThanOrEqual(300);
    expect(size).toBeGreaterThanOrEqual(38 * FOCUS_FIT_MIN);
  });

  it('stops at the minimum for a block that never fits, so the stage scrolls it', async () => {
    const view = await renderUi(<FocusAyah {...props} fitHeight={300} testID="focus" />);

    for (let pass = 0; pass < 20; pass += 1) {
      const size = sizeOf(view);
      await act(async () => {
        view.getByTestId('focus-block').props.onLayout({ nativeEvent: { layout: { height: size * 100, width: 360 } } });
      });
    }
    expect(sizeOf(view)).toBeCloseTo(38 * FOCUS_FIT_MIN, 5);
  });

  it('grows back to full size on a new stage height (a rotation)', async () => {
    const view = await renderUi(<FocusAyah {...props} fitHeight={300} testID="focus" />);
    await act(async () => {
      view.getByTestId('focus-block').props.onLayout({ nativeEvent: { layout: { height: 900, width: 360 } } });
    });
    expect(sizeOf(view)).toBeLessThan(38);

    // A taller stage (the window turned) starts again at full size, and only shrinks if the block still does not fit.
    await act(async () => view.rerender(
      <ThemeProvider name="light">
        <FocusAyah {...props} fitHeight={900} testID="focus" />
      </ThemeProvider>,
    ));
    expect(sizeOf(view)).toBe(38);
  });

  it('keeps the ayah text exactly as stored while it shrinks', async () => {
    const view = await renderUi(<FocusAyah {...props} fitHeight={100} testID="focus" />);
    await act(async () => {
      view.getByTestId('focus-block').props.onLayout({ nativeEvent: { layout: { height: 500, width: 360 } } });
    });
    expect(view.getByTestId('focus-current').props.children).toBe(props.textUthmani);
  });
});

describe('FocusAyah in a short window', () => {
  it('draws the ayah-number ornament smaller than in a tall window', async () => {
    setWindow(915, 412);
    const view = await renderUi(<FocusAyah textImlaei="text" textUthmani="ٱللَّهُ" verseNumber={255} testID="focus" />);
    const [mark] = view.getByTestId('focus-marker').children;

    expect(flatStyle(typeof mark === 'object' ? mark.props.style : undefined).fontSize).toBe(24);
  });

  it('keeps the ornament at its full size in a tall window', async () => {
    setWindow(390, 844);
    const view = await renderUi(<FocusAyah textImlaei="text" textUthmani="ٱللَّهُ" verseNumber={255} testID="focus" />);
    const [mark] = view.getByTestId('focus-marker').children;

    expect(flatStyle(typeof mark === 'object' ? mark.props.style : undefined).fontSize).toBe(34);
  });
});
