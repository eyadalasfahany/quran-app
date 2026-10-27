import { fireEvent } from '@testing-library/react-native';

import { themes } from '@/core/theme';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
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
    expect(flatStyle(view.getByTestId('page-ayah-1:1').props.style)).toMatchObject({
      color: themes.light.colors.ink,
      fontSize: 25,
      lineHeight: 59,
      textAlign: 'center',
    });
    expect(view.getByTestId('page-marker-1:1')).toBeOnTheScreen();
  });

  it('renders the ayah byte for byte in its Quran font, never scaled by the system', async () => {
    const view = await renderUi(fatihaPage({ fontScale: 1.2 }));
    const ayah = view.getByTestId('page-ayah-1:1');

    expect(ayah.props.children).toBe(ayahText);
    expect(ayah.props.allowFontScaling).toBe(false);
    expect(flatStyle(ayah.props.style).fontSize).toBeCloseTo(25 * 1.2);
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
  });

  it.each(locales)('keeps the Quran text right to left in %s', async (locale) => {
    const view = await renderUi(fatihaPage(), { locale });

    expect(view.getByTestId('page-surah-1')).toBeOnTheScreen();
    expect(flatStyle(view.getByTestId('page-ayah-1:1').props.style)).toMatchObject({ writingDirection: 'rtl' });
  });

  it('uses theme tokens only', () => {
    expect(featureComponentLiterals('features/reader/components/HafsMushafPage.tsx')).toEqual([]);
  });
});
