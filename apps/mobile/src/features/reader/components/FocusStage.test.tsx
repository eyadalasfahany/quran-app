import { fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { themes } from '@/core/theme';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { focusPageFromDrag, FocusStage } from './FocusStage';

const stage = {
  nextNumber: 6,
  nextText: 'ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ',
  previousNumber: 4,
  previousText: 'مَـٰلِكِ يَوْمِ ٱلدِّينِ',
  surahName: 'الفاتحة',
  textImlaei: 'إياك نعبد وإياك نستعين',
  textUthmani: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
  verseNumber: 5,
  versesCount: 7,
};

describe('FocusStage', () => {
  it('puts the exit bar below the status bar, where the reader toolbar sits', async () => {
    const view = await renderUi(
      <SafeAreaProvider initialMetrics={{ frame: { height: 844, width: 390, x: 0, y: 0 }, insets: { bottom: 34, left: 0, right: 0, top: 59 } }}>
        <FocusStage {...stage} onClose={() => undefined} testID="focus-stage" />
      </SafeAreaProvider>,
    );

    expect(flatStyle(view.getByTestId('focus-stage').props.style).paddingTop).toBe(59 + 8);
  });

  it.each(locales)('dims the ayah before and after the current one in %s', async (locale) => {
    const view = await renderUi(
      <FocusStage {...stage} onClose={() => undefined} onNext={() => undefined} onPrevious={() => undefined} />,
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

  it.each(locales)('labels the current ayah, its position and the swipe hint in %s', async (locale) => {
    const view = await renderUi(<FocusStage {...stage} onClose={() => undefined} />, { locale });

    const ayah = locale === 'ar' ? 'الآية ٥' : 'Ayah 5';
    expect(view.getByLabelText(`إياك نعبد وإياك نستعين ${ayah}`)).toBeOnTheScreen();
    expect(view.getByRole('button', { name: locale === 'ar' ? 'خروج من وضع التركيز' : 'Leave focus' })).toBeOnTheScreen();
    const position = view.getByText(locale === 'ar' ? 'الفاتحة · الآية ٥ من ٧' : 'الفاتحة · Ayah 5 of 7');
    const hint = view.getByText(locale === 'ar' ? 'اسحب لأعلى للآية التالية' : 'Swipe up for the next ayah');
    for (const text of [position, hint]) {
      expect(flatStyle(text.props.style)).toMatchObject({ color: themes.light.colors.inkMuted, textAlign: 'center' });
    }
  });

  it('opens ayah actions from the current ayah marker', async () => {
    const onOpenActions = jest.fn();
    const view = await renderUi(<FocusStage {...stage} onClose={() => undefined} onOpenActions={onOpenActions} />);

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
    const view = await renderUi(<FocusStage {...stage} onClose={() => undefined} onSelectVerse={onSelectVerse} />, {
      locale: 'ar',
    });

    await fireEvent.press(view.getByTestId('focus-progress-page-6', { includeHiddenElements: true }));
    expect(onSelectVerse).toHaveBeenCalledWith(6);
  });

  it('moves to the next ayah from the transport and leaves focus from the close control', async () => {
    const onClose = jest.fn();
    const onNext = jest.fn();
    const view = await renderUi(<FocusStage {...stage} onClose={onClose} onNext={onNext} />, { locale: 'ar' });

    expect(view.getByText('الفاتحة · الآية ٥ من ٧')).toBeOnTheScreen();
    await fireEvent.press(view.getByTestId('focus-transport-next'));
    await fireEvent.press(view.getByTestId('focus-stage-close'));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/components/FocusStage.tsx')).toEqual([]);
  });
});
