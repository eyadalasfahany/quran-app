import { act, fireEvent, within } from '@testing-library/react-native';
import { Dimensions, ScrollView } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { setUpTests, useReducedMotion } from 'react-native-reanimated';
import { usePanGesture } from 'react-native-gesture-handler';

import { themes } from '@/core/theme';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { measureWithin } from '../measure-within';
import { FOLLOW_VIEW_POSITION, recitedWordOffset } from '../word-follow';
import { focusSwipeTurn, FocusStage } from './FocusStage';

// The native measurement of the followed Text inside the scroll content: each follow test sets where it sits.
jest.mock('../measure-within', () => ({ measureWithin: jest.fn() }));

// The swipe's pan gesture is the real one; the test reads the callbacks the stage hands it.
jest.mock('react-native-gesture-handler', () => {
  const actual = jest.requireActual<typeof import('react-native-gesture-handler')>('react-native-gesture-handler');
  return { ...actual, usePanGesture: jest.fn(actual.usePanGesture) };
});

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { ...actual, __esModule: true, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

setUpTests();

const stage = {
  nextNumber: 6,
  nextText: 'ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ',
  previousNumber: 4,
  previousText: 'مَـٰلِكِ يَوْمِ ٱلدِّينِ',
  textImlaei: 'إياك نعبد وإياك نستعين',
  textUthmani: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
  verseNumber: 5,
  versesCount: 7,
};

const hidden = { includeHiddenElements: true } as const;

function setWindow(width: number, height: number) {
  Dimensions.set({
    screen: { fontScale: 1, height, scale: 1, width },
    window: { fontScale: 1, height, scale: 1, width },
  });
}

// The tall portrait window of the Focus frame, and a landscape phone (915 × 412 dp).
const PORTRAIT = { height: 844, width: 390 };
const LANDSCAPE = { height: 412, width: 915 };

beforeEach(() => {
  jest.mocked(usePanGesture).mockClear();
});

afterEach(() => {
  setWindow(PORTRAIT.width, PORTRAIT.height);
});

// The swipe's release callback as the stage hands it to the pan gesture.
async function releaseSwipe(translationY: number, velocityY = 0) {
  const config = jest.mocked(usePanGesture).mock.lastCall?.[0];
  if (config?.onDeactivate === undefined) {
    throw new Error('the stage gives the swipe no release callback');
  }
  // The release is scheduled on the JS thread, so the act waits for it.
  await act(async () => {
    config.onDeactivate!({ translationX: 0, translationY, velocityX: 0, velocityY } as never);
  });
}

async function layOutViewport(view: Awaited<ReturnType<typeof renderUi>>, height: number, contentHeight?: number) {
  await act(async () => {
    view.getByTestId('focus-stage-viewport').props.onLayout({
      nativeEvent: { layout: { height, width: 390, x: 0, y: 0 } },
    });
    if (contentHeight !== undefined) {
      view.getByTestId('focus-stage-scroll').props.onContentSizeChange(390, contentHeight);
    }
  });
}

async function scrollTo(view: Awaited<ReturnType<typeof renderUi>>, y: number) {
  await act(async () => {
    view.getByTestId('focus-stage-scroll').props.onScroll({ nativeEvent: { contentOffset: { y } } });
  });
}

describe('focusSwipeTurn', () => {
  const atBothEdges = { atEnd: true, atStart: true };

  it('turns to the next ayah on a swipe up that covers the distance, and to the previous one on a swipe down', () => {
    expect(focusSwipeTurn({ translationY: -120, velocityY: -100 }, atBothEdges)).toBe('next');
    expect(focusSwipeTurn({ translationY: 120, velocityY: 100 }, atBothEdges)).toBe('previous');
  });

  it('turns on a short flick of speed, but not on a tap-sized drag', () => {
    expect(focusSwipeTurn({ translationY: -40, velocityY: -900 }, atBothEdges)).toBe('next');
    expect(focusSwipeTurn({ translationY: 40, velocityY: 900 }, atBothEdges)).toBe('previous');
    expect(focusSwipeTurn({ translationY: -4, velocityY: -2000 }, atBothEdges)).toBeNull();
    expect(focusSwipeTurn({ translationY: -30, velocityY: -100 }, atBothEdges)).toBeNull();
  });

  it('keeps a scrolled ayah for its own scroll: next only from the end, previous only from the start', () => {
    const mid = { atEnd: false, atStart: false };
    expect(focusSwipeTurn({ translationY: -200, velocityY: -800 }, mid)).toBeNull();
    expect(focusSwipeTurn({ translationY: 200, velocityY: 800 }, mid)).toBeNull();
    expect(focusSwipeTurn({ translationY: -200, velocityY: 0 }, { atEnd: true, atStart: false })).toBe('next');
    expect(focusSwipeTurn({ translationY: 200, velocityY: 0 }, { atEnd: false, atStart: true })).toBe('previous');
  });
});

describe('FocusStage swipe', () => {
  it('a swipe up advances to the next ayah', async () => {
    const onNext = jest.fn();
    const onPrevious = jest.fn();
    await renderUi(<FocusStage {...stage} onNext={onNext} onPrevious={onPrevious} />);

    await releaseSwipe(-160, -400);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it('a swipe down goes back to the previous ayah', async () => {
    const onNext = jest.fn();
    const onPrevious = jest.fn();
    await renderUi(<FocusStage {...stage} onNext={onNext} onPrevious={onPrevious} />);

    await releaseSwipe(160, 400);
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).not.toHaveBeenCalled();
  });

  it('a short drag does nothing', async () => {
    const onNext = jest.fn();
    await renderUi(<FocusStage {...stage} onNext={onNext} />);

    await releaseSwipe(-12, -50);
    expect(onNext).not.toHaveBeenCalled();
  });

  // The reader passes no previous step at the first ayah and no next step at the last one.
  it('does nothing swiping down at the first ayah', async () => {
    const onPrevious = jest.fn();
    await renderUi(<FocusStage {...stage} onNext={() => undefined} onPrevious={undefined} verseNumber={1} />);

    await releaseSwipe(160, 400);
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it('does nothing swiping up at the last ayah', async () => {
    const onPrevious = jest.fn();
    await renderUi(<FocusStage {...stage} onNext={undefined} onPrevious={onPrevious} verseNumber={7} />);

    await releaseSwipe(-160, -400);
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it('a long ayah that is still scrolled does not turn the page until its scroll reaches the end', async () => {
    const onNext = jest.fn();
    const view = await renderUi(<FocusStage {...stage} onNext={onNext} />);
    await layOutViewport(view, 300, 900);

    await scrollTo(view, 200);
    await releaseSwipe(-160, -400);
    expect(onNext).not.toHaveBeenCalled();

    await scrollTo(view, 600);
    await releaseSwipe(-160, -400);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('a swipe still turns the page with Reduce Motion on (only the cross-fade remains)', async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    try {
      const onNext = jest.fn();
      await renderUi(<FocusStage {...stage} onNext={onNext} />);

      await releaseSwipe(-160, -400);
      expect(onNext).toHaveBeenCalledTimes(1);
    } finally {
      jest.mocked(useReducedMotion).mockReturnValue(false);
    }
  });

  it('a tap on a transport button goes to the button, not the swipe', async () => {
    const onNext = jest.fn();
    const view = await renderUi(<FocusStage {...stage} onNext={onNext} />);

    expect(within(view.getByTestId('focus-stage-viewport')).queryByTestId('focus-transport-next')).toBeNull();
    await fireEvent.press(view.getByTestId('focus-transport-next'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});

describe('FocusStage word follow', () => {
  const viewportHeight = 844;
  const lineHeight = 50;

  afterEach(() => {
    jest.mocked(measureWithin).mockReset();
    jest.mocked(ScrollView.prototype.scrollTo).mockClear();
  });

  // The stage has laid out its viewport and the followed Text's lines, and the list has scrolled to `scrollY`.
  async function layOutFollow(view: Awaited<ReturnType<typeof renderUi>>, scrollY: number, textUthmani: string) {
    const offset = recitedWordOffset(textUthmani, 2)!;
    await act(async () => {
      view.getByTestId('focus-stage-scroll').props.onScroll({ nativeEvent: { contentOffset: { y: scrollY } } });
      view.getByTestId('focus-stage-viewport').props.onLayout({
        nativeEvent: { layout: { height: viewportHeight, width: 390, x: 0, y: 0 } },
      });
      view.getByTestId('focus-stage-current').props.onTextLayout({
        nativeEvent: {
          lines: [
            { height: lineHeight, text: textUthmani.slice(0, offset), y: 0 },
            { height: lineHeight, text: textUthmani.slice(offset), y: lineHeight },
          ],
        },
      });
    });
  }

  it('scrolls the recited word line a third down when it has left the band, from the tracked scroll offset', async () => {
    // The followed Text sits 1000 down the scroll content and the stage has scrolled 200, so its top is 800 on screen.
    // Its second line sits at 850, below the band (168.8 to 675.2): it moves to a third down the viewport.
    jest.mocked(measureWithin).mockImplementation((_node, _content, onMeasured) => onMeasured(1000));
    const view = await renderUi(<FocusStage {...stage} activeWord={2} following recited testID="focus-stage" />);

    await layOutFollow(view, 200, stage.textUthmani);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    expect(ScrollView.prototype.scrollTo).toHaveBeenCalledTimes(1);
    expect(ScrollView.prototype.scrollTo).toHaveBeenCalledWith({
      animated: true,
      y: 200 + (850 - viewportHeight * FOLLOW_VIEW_POSITION),
    });
  });

  it('leaves the recited line alone while it is inside the band', async () => {
    // The Text sits 300 down the content; with no scroll its line is at 350, inside the band.
    jest.mocked(measureWithin).mockImplementation((_node, _content, onMeasured) => onMeasured(300));
    const view = await renderUi(<FocusStage {...stage} activeWord={2} following recited testID="focus-stage" />);

    await layOutFollow(view, 0, stage.textUthmani);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    expect(ScrollView.prototype.scrollTo).not.toHaveBeenCalled();
  });
});

describe('FocusStage', () => {
  it('starts below the reader toolbar', async () => {
    const view = await renderUi(<FocusStage {...stage} testID="focus-stage" topInset={123} />);

    expect(flatStyle(view.getByTestId('focus-stage').props.style).paddingTop).toBe(123);
  });

  it.each(locales)('dims the ayah before and after the current one in %s', async (locale) => {
    const view = await renderUi(
      <FocusStage {...stage} onNext={() => undefined} onPrevious={() => undefined} />,
      { locale },
    );

    expect(view.getByTestId('focus-stage-previous', hidden)).toHaveTextContent('مَـٰلِكِ يَوْمِ ٱلدِّينِ ﴿٤﴾');
    expect(view.getByTestId('focus-stage-next', hidden)).toHaveTextContent('ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ ﴿٦﴾');
    expect(flatStyle(view.getByTestId('focus-stage-previous', hidden).props.style).opacity).toBe(
      themes.light.opacity.focusAside,
    );
    expect(flatStyle(view.getByTestId('focus-stage-current').props.style)).toMatchObject({
      fontSize: 38,
      lineHeight: 80,
      textAlign: 'center',
      writingDirection: 'rtl',
    });
    expect(view.getByTestId('focus-stage-marker')).toBeOnTheScreen();
    expect(view.getByTestId('focus-stage-scroll')).toBeOnTheScreen();
  });

  it.each(locales)('labels the current ayah and the swipe hint in %s', async (locale) => {
    const view = await renderUi(<FocusStage {...stage} />, { locale });

    const ayah = locale === 'ar' ? 'الآية ٥' : 'Ayah 5';
    expect(view.getByLabelText(`إياك نعبد وإياك نستعين ${ayah}`)).toBeOnTheScreen();
    const hint = view.getByText(locale === 'ar' ? 'اسحب لأعلى للآية التالية' : 'Swipe up for the next ayah');
    expect(flatStyle(hint.props.style)).toMatchObject({ color: themes.light.colors.inkMuted, textAlign: 'center' });
  });

  it('opens ayah actions from the current ayah marker', async () => {
    const onOpenActions = jest.fn();
    const view = await renderUi(<FocusStage {...stage} onOpenActions={onOpenActions} />);

    await fireEvent.press(view.getByTestId('focus-stage-marker'));
    expect(onOpenActions).toHaveBeenCalledTimes(1);
  });

  it('opens the ayah chosen on the page marks', async () => {
    const onSelectVerse = jest.fn();
    const view = await renderUi(<FocusStage {...stage} onSelectVerse={onSelectVerse} />, {
      locale: 'ar',
    });

    await fireEvent.press(view.getByTestId('focus-progress-page-6', { includeHiddenElements: true }));
    expect(onSelectVerse).toHaveBeenCalledWith(6);
  });

  it('moves to the next ayah from the transport, with no close control of its own (FocusChrome holds the exit)', async () => {
    const onNext = jest.fn();
    const view = await renderUi(<FocusStage {...stage} onNext={onNext} />, { locale: 'ar' });

    await fireEvent.press(view.getByTestId('focus-transport-next'));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(view.queryByTestId('focus-stage-close')).toBeNull();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/components/FocusStage.tsx')).toEqual([]);
  });
});

describe('FocusStage in a short window', () => {
  it('hides the neighbouring ayat and the swipe hint, and gives the hint to the swipe surface', async () => {
    setWindow(LANDSCAPE.width, LANDSCAPE.height);
    const view = await renderUi(<FocusStage {...stage} onNext={() => undefined} onPrevious={() => undefined} />);

    expect(view.queryByTestId('focus-stage-previous', hidden)).toBeNull();
    expect(view.queryByTestId('focus-stage-next', hidden)).toBeNull();
    expect(view.queryByText('اسحب لأعلى للآية التالية')).toBeNull();
    expect(view.getByTestId('focus-stage-viewport').props.accessibilityHint).toBe('اسحب لأعلى للآية التالية');
    expect(view.getByTestId('focus-stage-current')).toBeOnTheScreen();
  });

  it('shows the neighbours and the hint in a tall window, with no swipe hint on the surface', async () => {
    const view = await renderUi(<FocusStage {...stage} onNext={() => undefined} onPrevious={() => undefined} />);

    expect(view.getByTestId('focus-stage-previous', hidden)).toBeOnTheScreen();
    expect(view.getByTestId('focus-stage-next', hidden)).toBeOnTheScreen();
    expect(view.getByText('اسحب لأعلى للآية التالية')).toBeOnTheScreen();
    expect(view.getByTestId('focus-stage-viewport').props.accessibilityHint).toBeUndefined();
  });

  it('fits the current ayah to the landscape stage, so it shrinks but stays at or above the minimum', async () => {
    setWindow(LANDSCAPE.width, LANDSCAPE.height);
    const view = await renderUi(<FocusStage {...stage} />);
    await layOutViewport(view, 250);

    // Each render's block is eight times the font size, so the ayah shrinks until it fits the 250 pt viewport.
    for (let pass = 0; pass < 12; pass += 1) {
      const size = flatStyle(view.getByTestId('focus-stage-current').props.style).fontSize as number;
      await act(async () => {
        view.getByTestId('focus-stage-block').props.onLayout({ nativeEvent: { layout: { height: size * 8, width: 800 } } });
      });
    }
    const size = flatStyle(view.getByTestId('focus-stage-current').props.style).fontSize as number;
    expect(size).toBeLessThan(38);
    expect(size).toBeGreaterThanOrEqual(38 * 0.6);
    expect(size * 8).toBeLessThanOrEqual(250 - 32);
  });
});

describe('FocusStage safe-area insets', () => {
  const insets = { bottom: 0, left: 40, right: 60, top: 0 };

  it.each(locales)('keeps the stage, the marks and the transport clear of the side insets in %s', async (locale) => {
    const view = await renderUi(
      <SafeAreaInsetsContext.Provider value={{ ...insets, bottom: 0 }}>
        <FocusStage {...stage} onNext={() => undefined} onPrevious={() => undefined} />
      </SafeAreaInsetsContext.Provider>,
      { locale },
    );

    // Arabic is right to left, so the start edge is the right inset; English takes the left one.
    const start = locale === 'ar' ? insets.right : insets.left;
    const end = locale === 'ar' ? insets.left : insets.right;
    expect(flatStyle(view.getByTestId('focus-stage-viewport').props.style)).toMatchObject({
      paddingEnd: end,
      paddingStart: start,
    });
    const transport = view.getByTestId('focus-stage-transport');
    expect(flatStyle(transport.props.style)).toMatchObject({ paddingEnd: end, paddingStart: start });
  });

  it('a plain stage has no side padding without an inset', async () => {
    const view = await renderUi(<FocusStage {...stage} />);

    expect(flatStyle(view.getByTestId('focus-stage-viewport').props.style)).toMatchObject({
      paddingEnd: 0,
      paddingStart: 0,
    });
  });
});
