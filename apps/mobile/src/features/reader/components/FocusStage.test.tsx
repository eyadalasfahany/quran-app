import { act, fireEvent } from '@testing-library/react-native';
import { ScrollView } from 'react-native';

import { themes } from '@/core/theme';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { measureWithin } from '../measure-within';
import { FOLLOW_VIEW_POSITION, recitedWordOffset } from '../word-follow';
import { focusPageFromDrag, FocusStage } from './FocusStage';

// The native measurement of the followed Text inside the scroll content: each follow test sets where it sits.
jest.mock('../measure-within', () => ({ measureWithin: jest.fn() }));

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
      view.getByTestId('focus-stage-scroll').parent!.props.onLayout({
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

    const hidden = { includeHiddenElements: true } as const;
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

  it('turns the page from a pull past the ayah and leaves a long ayah scrollable in the middle', () => {
    const edge = { height: 400 };
    expect(
      focusPageFromDrag({
        contentOffset: { y: 40 },
        contentSize: { height: 400 },
        layoutMeasurement: edge,
        velocity: { y: -1 },
      }),
    ).toBe('next');
    expect(
      focusPageFromDrag({
        contentOffset: { y: 200 },
        contentSize: { height: 900 },
        layoutMeasurement: edge,
        velocity: { y: -1 },
      }),
    ).toBeNull();
    expect(
      focusPageFromDrag({
        contentOffset: { y: 500 },
        contentSize: { height: 900 },
        layoutMeasurement: edge,
        velocity: { y: -1 },
      }),
    ).toBe('next');
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
