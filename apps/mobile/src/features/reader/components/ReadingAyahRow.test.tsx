import { fireEvent, within } from '@testing-library/react-native';

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
