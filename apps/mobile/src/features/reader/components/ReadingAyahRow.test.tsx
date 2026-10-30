import { fireEvent, within } from '@testing-library/react-native';

import { formatNumber, i18n } from '@/core/i18n';
import { themes } from '@/core/theme';

import { openReaderTestContent } from '../../../../jest/reader-test-db';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { getVerseByKey } from '../data/verses';
import { ReadingAyahRow } from './ReadingAyahRow';

const colors = themes.light.colors;

describe('ReadingAyahRow', () => {
  it('renders 2:255 Uthmani text byte for byte', async () => {
    const { executor } = await openReaderTestContent();
    const verse = getVerseByKey(executor, '2:255');
    expect(verse).toBeDefined();

    const view = await renderUi(
      <ReadingAyahRow
        fontScale={1}
        onPress={() => undefined}
        testID="row"
        textImlaei={verse!.textImlaei}
        textUthmani={verse!.textUthmani}
        verseNumber={255}
      />,
    );

    expect(view.getByText(verse!.textUthmani)).toBeOnTheScreen();
  });

  it.each(locales)('uses the Imla\'i text in the accessibility label (%s)', async (locale) => {
    const view = await renderUi(
      <ReadingAyahRow
        onPress={() => undefined}
        testID="row"
        textImlaei="الله لا إله إلا هو"
        textUthmani="ٱللَّهُ لَآ إِلَـٰهَ إِلَّا هُوَ"
        verseNumber={255}
      />,
      { locale },
    );

    const label =
      locale === 'ar' ? 'الله لا إله إلا هو الآية ٢٥٥' : 'الله لا إله إلا هو Ayah 255';
    expect(view.getByLabelText(label)).toBeOnTheScreen();
  });

  function quranBlockStyle(view: Awaited<ReturnType<typeof renderUi>>) {
    const text = view.getByText('ٱللَّهُ');
    expect(text.parent).toBeDefined();
    return flatStyle(text.parent!.props.style);
  }

  it('shows the active wash and brand rule when selected', async () => {
    const view = await renderUi(
      <ReadingAyahRow onPress={() => undefined} selected testID="row" textImlaei="text" textUthmani="ٱللَّهُ" verseNumber={1} />,
    );
    expect(quranBlockStyle(view)).toMatchObject({
      backgroundColor: colors.highlightActive,
      borderStartColor: colors.brand,
      borderStartWidth: themes.light.stroke.activeRule,
    });
    expect(view.getByRole('button', { name: 'text الآية ١' }).props.accessibilityState).toMatchObject({ selected: true });
  });

  // ADR 0012: a user's colour fills the ayah; the selection wash shows only on an ayah without one.
  it.each(locales)('selected and highlighted: fills with the colour and keeps the brand rule (%s)', async (locale) => {
    const view = await renderUi(
      <ReadingAyahRow
        highlightColor="green"
        onPress={() => undefined}
        selected
        testID="row"
        textImlaei="text"
        textUthmani="ٱللَّهُ"
        verseNumber={1}
      />,
      { locale },
    );
    expect(quranBlockStyle(view)).toMatchObject({
      backgroundColor: colors.highlightGreen,
      borderStartColor: colors.brand,
      borderStartWidth: themes.light.stroke.activeRule,
    });
    const name = `text ${i18n.t('ui.ayahNumber', { number: formatNumber(1, locale) })} ${i18n.t('ui.highlight.green')}`;
    expect(view.getByRole('button', { name }).props.accessibilityState).toMatchObject({ selected: true });
  });

  it.each(locales)('selected only: shows the selection wash (%s)', async (locale) => {
    const view = await renderUi(
      <ReadingAyahRow onPress={() => undefined} selected testID="row" textImlaei="text" textUthmani="ٱللَّهُ" verseNumber={1} />,
      { locale },
    );
    expect(quranBlockStyle(view)).toMatchObject({ backgroundColor: colors.highlightActive, borderStartColor: colors.brand });
  });

  it.each(locales)('highlighted only: fills with the colour and no brand rule (%s)', async (locale) => {
    const view = await renderUi(
      <ReadingAyahRow highlightColor="rose" onPress={() => undefined} testID="row" textImlaei="text" textUthmani="ٱللَّهُ" verseNumber={1} />,
      { locale },
    );
    expect(quranBlockStyle(view)).toMatchObject({ backgroundColor: colors.highlightRose, borderStartWidth: 0 });
  });

  it('closes the row with a hairline divider', async () => {
    const view = await renderUi(
      <ReadingAyahRow onPress={() => undefined} testID="row" textImlaei="text" textUthmani="ٱللَّهُ" verseNumber={1} />,
    );

    expect(flatStyle(view.getByTestId('row-divider', { includeHiddenElements: true }).props.style)).toMatchObject({
      backgroundColor: colors.line,
      height: themes.light.stroke.hairline,
      marginTop: themes.light.space[4],
    });
  });

  it('shows the active wash when recited', async () => {
    const view = await renderUi(
      <ReadingAyahRow onPress={() => undefined} recited testID="row" textImlaei="text" textUthmani="ٱللَّهُ" verseNumber={1} />,
    );
    expect(quranBlockStyle(view)).toMatchObject({
      backgroundColor: colors.highlightActive,
      borderStartColor: colors.brand,
    });
  });

  it('draws a gold margin rule when khatma marked and not active', async () => {
    const view = await renderUi(
      <ReadingAyahRow khatmaMarked onPress={() => undefined} testID="row" textImlaei="text" textUthmani="ٱللَّهُ" verseNumber={1} />,
    );
    expect(quranBlockStyle(view)).toMatchObject({
      borderStartColor: colors.gold,
      borderStartWidth: themes.light.stroke.activeRule,
    });
  });

  it('prefers the brand rule when khatma marked and recited', async () => {
    const view = await renderUi(
      <ReadingAyahRow khatmaMarked onPress={() => undefined} recited testID="row" textImlaei="text" textUthmani="ٱللَّهُ" verseNumber={1} />,
    );
    expect(quranBlockStyle(view)).toMatchObject({ borderStartColor: colors.brand });
  });

  it.each(locales)('appends the khatma label to the accessibility label (%s)', async (locale) => {
    const view = await renderUi(
      <ReadingAyahRow khatmaMarked onPress={() => undefined} testID="row" textImlaei="text" textUthmani="ٱللَّهُ" verseNumber={1} />,
      { locale },
    );
    const suffix = locale === 'ar' ? 'موضع الختمة' : 'Khatma position';
    expect(view.getByRole('button', { name: new RegExp(suffix) })).toBeOnTheScreen();
  });

  it('fills from the highlight token and names the colour for screen readers', async () => {
    const view = await renderUi(
      <ReadingAyahRow
        highlightColor="gold"
        onPress={() => undefined}
        testID="row"
        textImlaei="text"
        textUthmani="ٱللَّهُ"
        verseNumber={1}
      />,
    );
    expect(quranBlockStyle(view)).toMatchObject({
      backgroundColor: colors.highlightGold,
      borderStartColor: 'transparent',
    });
    expect(view.getByRole('button', { name: 'text الآية ١ تظليل ذهبي' })).toBeOnTheScreen();
  });

  it('calls onLongPress for ayah actions', async () => {
    const onLongPress = jest.fn();
    const view = await renderUi(
      <ReadingAyahRow
        onLongPress={onLongPress}
        onPress={() => undefined}
        testID="row"
        textImlaei="text"
        textUthmani="ٱللَّهُ"
        verseNumber={1}
      />,
    );

    await fireEvent(view.getByTestId('row'), 'longPress');
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('lays Quran text out right to left whatever the locale (%s)', async (locale) => {
    const view = await renderUi(
      <ReadingAyahRow onPress={() => undefined} testID="row" textImlaei="text" textUthmani="ٱللَّهُ" verseNumber={1} />,
      { locale },
    );

    expect(flatStyle(view.getByText('ٱللَّهُ').props.style)).toMatchObject({
      direction: 'ltr',
      textAlign: 'right',
      writingDirection: 'rtl',
    });
  });

  it('calls onPress on the text and onOpenActions from the marker', async () => {
    const onPress = jest.fn();
    const onOpenActions = jest.fn();
    const view = await renderUi(
      <ReadingAyahRow
        onOpenActions={onOpenActions}
        onPress={onPress}
        testID="row"
        textImlaei="text"
        textUthmani="ٱللَّهُ"
        verseNumber={1}
      />,
    );

    await fireEvent.press(view.getByTestId('row'));
    expect(onPress).toHaveBeenCalledTimes(1);
    await fireEvent.press(view.getByTestId('row-header-marker'));
    expect(onOpenActions).toHaveBeenCalledTimes(1);
  });

  it('keeps the header buttons outside the text control, so each is reachable on its own', async () => {
    const view = await renderUi(
      <ReadingAyahRow
        onOpenActions={() => undefined}
        onOpenTafsir={() => undefined}
        onPress={() => undefined}
        testID="row"
        textImlaei="text"
        textUthmani="ٱللَّهُ"
        verseNumber={1}
      />,
    );

    const text = view.getByTestId('row');
    expect(within(text).queryByRole('button', { name: 'التفسير' })).toBeNull();
    expect(view.getByRole('button', { name: 'التفسير' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'المزيد' })).toBeOnTheScreen();
  });

  it('opens tafsir from the header tafsir button', async () => {
    const onOpenTafsir = jest.fn();
    const view = await renderUi(
      <ReadingAyahRow
        onOpenActions={() => undefined}
        onOpenTafsir={onOpenTafsir}
        onPress={() => undefined}
        testID="row"
        textImlaei="text"
        textUthmani="ٱللَّهُ"
        verseNumber={1}
      />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'التفسير' }));
    expect(onOpenTafsir).toHaveBeenCalledTimes(1);
  });

  it('pads the row 14 pt above the header and 16 pt above the hairline', async () => {
    const view = await renderUi(
      <ReadingAyahRow onPress={() => undefined} testID="row" textImlaei="text" textUthmani="ٱللَّهُ" verseNumber={1} />,
    );

    expect(flatStyle(view.getByTestId('row-header').parent!.props.style)).toMatchObject({ paddingTop: 14 });
    expect(flatStyle(view.getByTestId('row-divider', { includeHiddenElements: true }).props.style).marginTop).toBe(
      themes.light.space[4],
    );
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/components/ReadingAyahRow.tsx')).toEqual([]);
  });
});

describe('ReadingAyahRow recitation', () => {
  const props = { onPress: () => undefined, textImlaei: 'text', testID: 'row', textUthmani: 'ٱللَّهُ لَآ', verseNumber: 1 };

  function quranBlock(view: Awaited<ReturnType<typeof renderUi>>) {
    return flatStyle(view.getByText('ٱللَّهُ لَآ').parent!.props.style);
  }

  it('shows pause on the recited ayah while playing, and forwards the press', async () => {
    const onPlay = jest.fn();
    const view = await renderUi(
      <ReadingAyahRow audioAvailable onPlay={onPlay} playing recited textImlaei="x" textUthmani="x" verseNumber={1} />,
      { locale: 'en' },
    );

    await fireEvent.press(view.getByRole('button', { name: 'Pause' }));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('the recited ayah gets the neutral wash, the brand rule and the recited hint', async () => {
    const view = await renderUi(<ReadingAyahRow {...props} recited />);
    expect(quranBlock(view)).toMatchObject({
      backgroundColor: colors.highlightActive,
      borderStartColor: colors.brand,
      borderStartWidth: themes.light.stroke.activeRule,
    });
    const row = view.getByRole('button', { name: 'text الآية ١' });
    expect(row.props.accessibilityState).toMatchObject({ selected: true });
    expect(row.props.accessibilityHint).toBe('يُتلى الآن');
  });

  it('a user colour still fills the recited ayah', async () => {
    const view = await renderUi(<ReadingAyahRow {...props} highlightColor="green" recited />);
    expect(quranBlock(view)).toMatchObject({ backgroundColor: colors.highlightGreen, borderStartColor: colors.brand });
  });

  it('an ayah that is not recited has no hint', async () => {
    const view = await renderUi(<ReadingAyahRow {...props} />);
    expect(view.getByRole('button', { name: 'text الآية ١' }).props.accessibilityHint).toBeUndefined();
  });

  it('the play button calls onPlay when a reciter is available', async () => {
    const onPlay = jest.fn();
    const view = await renderUi(<ReadingAyahRow {...props} audioAvailable onPlay={onPlay} />);
    fireEvent.press(view.getByTestId('row-header-play'));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('the play button is disabled, with the hint, while no reciter is available', async () => {
    const onPlay = jest.fn();
    const view = await renderUi(<ReadingAyahRow {...props} audioAvailable={false} onPlay={onPlay} />, { locale: 'en' });
    const play = view.getByTestId('row-header-play');
    expect(play.props.accessibilityState).toMatchObject({ disabled: true });
    expect(play.props.accessibilityHint).toBe("Recitation isn't available yet");
    fireEvent.press(play);
    expect(onPlay).not.toHaveBeenCalled();
  });
});
