import { fireEvent } from '@testing-library/react-native';

import { formatNumber, i18n } from '@/core/i18n';
import { themes } from '@/core/theme';

import { openReaderTestContent } from '../../../../jest/reader-test-db';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { getVersesByPage } from '../data/verses';
import { listChapters } from '../data/chapters';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import type { ChapterRecord } from '../data/chapters';
import type { VerseRecord } from '../data/verses';
import { HafsMushafPage } from './HafsMushafPage';

const ayahText = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

function verse(overrides: Partial<VerseRecord> & Pick<VerseRecord, 'id' | 'verseKey' | 'verseNumber'>): VerseRecord {
  return {
    chapterId: 1,
    hizb: 1,
    juz: 1,
    page: 1,
    rubElHizb: 1,
    sajdah: 'none',
    textImlaei: null,
    textIndopak: null,
    textSearch: '',
    textUthmani: ayahText,
    textUthmaniTajweed: null,
    ...overrides,
  };
}

const fatiha: ChapterRecord = {
  bismillahImlaei: null,
  bismillahPre: 1,
  bismillahText: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
  id: 1,
  nameArabic: 'الفاتحة',
  nameEn: 'Al-Fatihah',
  nameSimple: 'Al-Fatihah',
  pageEnd: 1,
  pageStart: 1,
  revelationOrder: 5,
  revelationPlace: 'makkah',
  versesCount: 7,
};

const baqarah: ChapterRecord = {
  ...fatiha,
  bismillahText: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
  id: 2,
  nameArabic: 'البقرة',
  nameEn: 'The Cow',
  nameSimple: 'Al-Baqarah',
  pageEnd: 49,
  pageStart: 2,
  revelationPlace: 'madinah',
  versesCount: 286,
};

const fatihaPage = (props: Partial<Parameters<typeof HafsMushafPage>[0]> = {}) => (
  <HafsMushafPage
    chapters={new Map([[1, fatiha]])}
    testID="page"
    verses={[verse({ id: 1, verseKey: '1:1', verseNumber: 1 })]}
    {...props}
  />
);

describe('HafsMushafPage', () => {
  it('draws the double gold page frame at the mushaf type size with an app-drawn marker', async () => {
    const view = await renderUi(fatihaPage());

    expect(view.getByText('سورة الفاتحة')).toBeOnTheScreen();
    expect(flatStyle(view.getByTestId('page').props.style)).toMatchObject({
      borderColor: themes.light.colors.gold,
      borderRadius: 6,
      borderWidth: 1.5,
      padding: 6,
    });
    expect(flatStyle(view.getByTestId('page-inner').props.style)).toMatchObject({
      alignItems: 'center',
      borderColor: themes.light.colors.gold,
      borderRadius: 3,
      borderWidth: 0.75,
      gap: 18,
      paddingBottom: 26,
      paddingHorizontal: 18,
      paddingTop: 22,
    });
    expect(flatStyle(view.getByTestId('page-text-1:1').props.style)).toMatchObject({
      color: themes.light.colors.ink,
      fontSize: 25,
      lineHeight: 59,
      textAlign: 'justify',
    });
    expect(view.getByTestId('page-marker-1:1')).toBeOnTheScreen();
  });

  it('renders the ayah byte for byte in its Quran font, never scaled by the system', async () => {
    const view = await renderUi(fatihaPage({ fontScale: 1.2 }));
    const paragraph = view.getByTestId('page-text-1:1');

    expect(view.getByTestId('page-ayah-1:1').props.children).toBe(ayahText);
    expect(paragraph.props.allowFontScaling).toBe(false);
    expect(flatStyle(paragraph.props.style).fontSize).toBeCloseTo(25 * 1.2);
  });

  it('flows the ayahs of a surah next to each other in one paragraph, each followed by its end mark', async () => {
    const view = await renderUi(
      fatihaPage({
        verses: [
          verse({ id: 1, verseKey: '1:1', verseNumber: 1 }),
          verse({ id: 2, textUthmani: 'ٱلْحَمْدُ لِلَّهِ', verseKey: '1:2', verseNumber: 2 }),
        ],
      }),
    );
    const paragraph = view.getByTestId('page-text-1:1');

    expect(paragraph).toContainElement(view.getByTestId('page-ayah-1:2'));
    expect(paragraph).toContainElement(view.getByTestId('page-marker-1:2'));
    expect(view.getByTestId('page-ayah-1:2').props.children).toBe('ٱلْحَمْدُ لِلَّهِ');
    expect(view.queryByTestId('page-text-1:2')).toBeNull();
  });

  it('starts a new paragraph under the cartouche where the next surah begins', async () => {
    const view = await renderUi(
      <HafsMushafPage
        chapters={new Map([[1, fatiha], [2, baqarah]])}
        testID="page"
        verses={[
          verse({ id: 7, verseKey: '1:7', verseNumber: 7 }),
          verse({ chapterId: 2, id: 8, verseKey: '2:1', verseNumber: 1 }),
          verse({ chapterId: 2, id: 9, verseKey: '2:2', verseNumber: 2 }),
        ]}
      />,
    );

    expect(view.getByTestId('page-text-1:7')).not.toContainElement(view.getByTestId('page-ayah-2:1'));
    expect(view.getByTestId('page-text-2:1')).toContainElement(view.getByTestId('page-ayah-2:2'));
    expect(view.getByTestId('page-surah-2')).toBeOnTheScreen();
    expect(view.queryByTestId('page-surah-1')).toBeNull();
  });

  it('shows the bismillah before the first ayah of a surah other than al-Fatihah', async () => {
    const withBismillah = await renderUi(
      <HafsMushafPage
        chapters={new Map([[2, baqarah]])}
        testID="page"
        verses={[verse({ chapterId: 2, id: 8, verseKey: '2:1', verseNumber: 1 })]}
      />,
    );
    expect(withBismillah.getByTestId('page-bismillah-2')).toBeOnTheScreen();

    const fatihaOnly = await renderUi(fatihaPage());
    expect(fatihaOnly.queryByTestId('page-bismillah-1')).toBeNull();
  });

  it('selects on press and opens actions on long press or the marker', async () => {
    const onPressVerse = jest.fn();
    const onOpenActions = jest.fn();
    const view = await renderUi(fatihaPage({ onOpenActions, onPressVerse }));

    await fireEvent.press(view.getByTestId('page-ayah-1:1'));
    expect(onPressVerse).toHaveBeenCalledWith('1:1');

    await fireEvent(view.getByTestId('page-ayah-1:1'), 'longPress');
    await fireEvent.press(view.getByTestId('page-marker-1:1'));
    expect(onOpenActions).toHaveBeenNthCalledWith(1, '1:1');
    expect(onOpenActions).toHaveBeenNthCalledWith(2, '1:1');
  });

  it('marks the selected ayah and labels its marker', async () => {
    const view = await renderUi(fatihaPage({ onOpenActions: () => undefined, selectedVerseKey: '1:1' }));

    expect(view.getByRole('header', { name: 'سورة الفاتحة' })).toBeOnTheScreen();
    const marker = view.getByRole('button', { name: 'الآية ١' });
    expect(marker.props.accessibilityState).toMatchObject({ selected: true });
    expect(flatStyle(view.getByTestId('page-ayah-1:1').props.style).backgroundColor).toBe(
      themes.light.colors.highlightActive,
    );
  });

  it.each(locales)('keeps the Quran text right to left in %s', async (locale) => {
    const view = await renderUi(fatihaPage(), { locale });

    expect(view.getByTestId('page-surah-1')).toBeOnTheScreen();
    expect(flatStyle(view.getByTestId('page-text-1:1').props.style)).toMatchObject({ writingDirection: 'rtl' });
  });

  it('reports the paragraph of the surah holding the ayah the reader opened at, once laid out', async () => {
    const onFocusRunLayout = jest.fn();
    const view = await renderUi(
      <HafsMushafPage
        chapters={new Map([[1, fatiha], [2, baqarah]])}
        focusVerseKey="2:1"
        onFocusRunLayout={onFocusRunLayout}
        testID="page"
        verses={[
          verse({ id: 7, verseKey: '1:7', verseNumber: 7 }),
          verse({ chapterId: 2, id: 8, verseKey: '2:1', verseNumber: 1 }),
        ]}
      />,
    );

    const run = view.getByTestId('page-focus-run');
    expect(run).toContainElement(view.getByTestId('page-surah-2'));
    await fireEvent(run, 'layout', { nativeEvent: { layout: { height: 300, width: 320, x: 0, y: 400 } } });
    expect(onFocusRunLayout).toHaveBeenCalledTimes(1);
  });

  it('marks no paragraph when the reader has no focus ayah on the page', async () => {
    const view = await renderUi(fatihaPage());

    expect(view.queryByTestId('page-focus-run')).toBeNull();
  });

  it('fills a highlighted ayah with its colour and leaves the others unfilled', async () => {
    const view = await renderUi(
      fatihaPage({
        highlightsByVerseId: new Map([[1, 'green']]),
        verses: [
          verse({ id: 1, verseKey: '1:1', verseNumber: 1 }),
          verse({ id: 2, textUthmani: 'ٱلْحَمْدُ لِلَّهِ', verseKey: '1:2', verseNumber: 2 }),
        ],
      }),
    );

    expect(flatStyle(view.getByTestId('page-ayah-1:1').props.style).backgroundColor).toBe(
      themes.light.colors.highlightGreen,
    );
    expect(flatStyle(view.getByTestId('page-ayah-1:2').props.style).backgroundColor).toBeUndefined();
  });

  // ADR 0012: a saved colour fills the ayah even when it is selected; the selected marker carries the selection.
  it.each(locales)('selected and highlighted: fills with the colour and marks it selected (%s)', async (locale) => {
    const view = await renderUi(
      fatihaPage({ highlightsByVerseId: new Map([[1, 'green']]), onOpenActions: () => undefined, selectedVerseKey: '1:1' }),
      { locale },
    );

    expect(flatStyle(view.getByTestId('page-ayah-1:1').props.style).backgroundColor).toBe(
      themes.light.colors.highlightGreen,
    );
    const marker = view.getByRole('button', { name: i18n.t('ui.ayahNumber', { number: formatNumber(1, locale) }) });
    expect(marker.props.accessibilityState).toMatchObject({ selected: true });
  });

  it.each(locales)('selected only: shows the selection wash (%s)', async (locale) => {
    const view = await renderUi(fatihaPage({ onOpenActions: () => undefined, selectedVerseKey: '1:1' }), { locale });

    expect(flatStyle(view.getByTestId('page-ayah-1:1').props.style).backgroundColor).toBe(
      themes.light.colors.highlightActive,
    );
  });

  it.each(locales)('highlighted only: fills with the colour (%s)', async (locale) => {
    const view = await renderUi(fatihaPage({ highlightsByVerseId: new Map([[1, 'rose']]) }), { locale });

    expect(flatStyle(view.getByTestId('page-ayah-1:1').props.style).backgroundColor).toBe(
      themes.light.colors.highlightRose,
    );
  });

  it.each(locales)('names the highlight colour in the ayah label in %s', async (locale) => {
    const view = await renderUi(fatihaPage({ highlightsByVerseId: new Map([[1, 'rose']]) }), { locale });
    const ayahNumber = i18n.t('ui.ayahNumber', { number: formatNumber(1, locale) });

    expect(view.getByTestId('page-ayah-1:1').props.accessibilityLabel).toBe(
      `${ayahText} ${ayahNumber} ${i18n.t('ui.highlight.rose')}`,
    );
  });

  it('uses theme tokens only', () => {
    expect(featureComponentLiterals('features/reader/components/HafsMushafPage.tsx')).toEqual([]);
  });
});

describe('HafsMushafPage recitation', () => {
  it('the recited ayah gets the wash and the brand marker, and says it is being recited', async () => {
    const { executor } = await openReaderTestContent();
    const verses = getVersesByPage(executor, 1).slice(0, 2);
    const chapters = new Map(listChapters(executor).map((chapter) => [chapter.id, chapter]));
    const recited = verses[1]!;
    const view = await renderUi(
      <HafsMushafPage chapters={chapters} recitedVerseKey={recited.verseKey} testID="page" verses={verses} />,
    );
    const text = view.getByTestId(`page-ayah-${recited.verseKey}`);
    expect(flatStyle(text.props.style)).toMatchObject({ backgroundColor: themes.light.colors.highlightActive });
    expect(text.props.accessibilityHint).toBe('يُتلى الآن');
    expect(view.getByTestId(`page-marker-${recited.verseKey}`).props.accessibilityState ?? {}).toBeDefined();
    const other = verses[0]!;
    expect(flatStyle(view.getByTestId(`page-ayah-${other.verseKey}`).props.style).backgroundColor).toBeUndefined();
  });

  it('marks the recited word inside the recited ayah, keeping the ayah text exact', async () => {
    const { executor } = await openReaderTestContent();
    const verses = getVersesByPage(executor, 1).slice(0, 2);
    const chapters = new Map(listChapters(executor).map((chapter) => [chapter.id, chapter]));
    const recited = verses[1]!;
    const words = recited.textUthmani.split(' ').filter((token) => /\p{L}/u.test(token));
    const view = await renderUi(
      <HafsMushafPage chapters={chapters} recitedVerseKey={recited.verseKey} recitedWord={2} testID="page" verses={verses} />,
    );

    const word = view.getByTestId(`page-ayah-${recited.verseKey}-word`);
    expect(word).toHaveTextContent(words[1]!);
    expect(flatStyle(word.props.style)).toMatchObject({ backgroundColor: themes.light.colors.brandSurface });
    expect(view.getByTestId(`page-ayah-${recited.verseKey}`)).toHaveTextContent(recited.textUthmani);
  });

  it('marks no word without a word position, and none in an ayah that is not recited', async () => {
    const { executor } = await openReaderTestContent();
    const verses = getVersesByPage(executor, 1).slice(0, 2);
    const chapters = new Map(listChapters(executor).map((chapter) => [chapter.id, chapter]));
    const view = await renderUi(
      <HafsMushafPage chapters={chapters} recitedVerseKey={verses[1]!.verseKey} testID="page" verses={verses} />,
    );

    expect(view.queryByTestId(`page-ayah-${verses[1]!.verseKey}-word`)).toBeNull();
    expect(view.queryByTestId(`page-ayah-${verses[0]!.verseKey}-word`)).toBeNull();
  });
});
