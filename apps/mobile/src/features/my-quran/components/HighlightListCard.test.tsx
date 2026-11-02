import { fireEvent } from '@testing-library/react-native';

import { getHighlights, setHighlight } from '@/features/library/data';
import type { ChapterRecord } from '@/features/reader/data/chapters';
import type { VerseRecord } from '@/features/reader/data/verses';

import { locales, renderUi } from '../../../../jest/render-ui';
import { openUserTestStore } from '../../../../jest/user-test-db';
import { HighlightListCard } from './HighlightListCard';

const chapter: ChapterRecord = {
  bismillahImlaei: null,
  bismillahPre: 1,
  bismillahText: null,
  id: 2,
  nameArabic: 'البقرة',
  nameEn: 'The Cow',
  nameSimple: 'Al-Baqarah',
  pageEnd: 49,
  pageStart: 2,
  revelationOrder: 87,
  revelationPlace: 'madinah',
  versesCount: 286,
};

const verse: VerseRecord = {
  chapterId: 2,
  hizb: 1,
  id: 262,
  juz: 3,
  page: 42,
  rubElHizb: 1,
  sajdah: 'none',
  textImlaei: null,
  textIndopak: null,
  textSearch: '',
  textUthmani: 'ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ',
  textUthmaniTajweed: null,
  verseKey: '2:255',
  verseNumber: 255,
};

describe('HighlightListCard', () => {
  it.each(locales)('draws the empty state with the open-mushaf action (%s)', async (locale) => {
    const onOpenMushaf = jest.fn();
    const view = await renderUi(
      <HighlightListCard items={[]} onOpenMushaf={onOpenMushaf} onOpenVerse={jest.fn()} />,
      { locale },
    );

    expect(view.getByText(locale === 'ar' ? 'لا توجد تظليلات بعد' : 'No highlights yet')).toBeOnTheScreen();

    fireEvent.press(view.getByRole('button', { name: locale === 'ar' ? 'افتح المصحف' : 'Open the Mushaf' }));

    expect(onOpenMushaf).toHaveBeenCalledTimes(1);
  });

  it('lists each highlight with its colour name and opens the reader on press', async () => {
    const { store } = openUserTestStore();
    setHighlight(262, 'gold', store);
    const row = getHighlights([262], store)[0]!;
    const onOpenVerse = jest.fn();
    const view = await renderUi(
      <HighlightListCard
        items={[{ row, verse, chapter }]}
        onOpenMushaf={jest.fn()}
        onOpenVerse={onOpenVerse}
        store={store}
      />,
    );

    fireEvent.press(view.getByRole('button', { name: 'البقرة · الآية ٢٥٥, تظليل ذهبي' }));

    expect(onOpenVerse).toHaveBeenCalledWith('2:255');
  });

  it('filters the rows by colour chip', async () => {
    const { store } = openUserTestStore();
    setHighlight(262, 'gold', store);
    setHighlight(263, 'green', store);
    const rows = getHighlights([262, 263], store);
    const gold = { row: rows.find((row) => row.color === 'gold')!, verse, chapter };
    const green = {
      row: rows.find((row) => row.color === 'green')!,
      verse: { ...verse, id: 263, verseKey: '2:256', verseNumber: 256 },
      chapter,
    };
    const view = await renderUi(
      <HighlightListCard items={[gold, green]} onOpenMushaf={jest.fn()} onOpenVerse={jest.fn()} store={store} />,
    );

    expect(view.getByText('البقرة · الآية ٢٥٥')).toBeOnTheScreen();
    expect(view.getByText('البقرة · الآية ٢٥٦')).toBeOnTheScreen();

    fireEvent.press(view.getByRole('radio', { name: 'ذهبي' }));

    expect(await view.findByText('البقرة · الآية ٢٥٥')).toBeOnTheScreen();
    expect(view.queryByText('البقرة · الآية ٢٥٦')).toBeNull();

    fireEvent.press(view.getByRole('radio', { name: 'الكل' }));

    expect(await view.findByText('البقرة · الآية ٢٥٦')).toBeOnTheScreen();
  });

  it('names the surah by its transliteration in English', async () => {
    const { store } = openUserTestStore();
    setHighlight(262, 'gold', store);
    const row = getHighlights([262], store)[0]!;
    const view = await renderUi(
      <HighlightListCard items={[{ row, verse, chapter }]} onOpenMushaf={jest.fn()} onOpenVerse={jest.fn()} store={store} />,
      { locale: 'en' },
    );

    expect(view.getByRole('button', { name: /^Al-Baqarah · Ayah 255,/ })).toBeOnTheScreen();
    expect(view.queryByText(/البقرة/)).toBeNull();
  });

  it('removes the highlight through the repository', async () => {
    const { store } = openUserTestStore();
    setHighlight(262, 'blue', store);
    const row = getHighlights([262], store)[0]!;
    const view = await renderUi(
      <HighlightListCard
        items={[{ row, verse, chapter }]}
        onOpenMushaf={jest.fn()}
        onOpenVerse={jest.fn()}
        store={store}
      />,
    );

    fireEvent.press(view.getByRole('button', { name: 'إزالة التظليل' }));

    expect(getHighlights([262], store)).toEqual([]);
  });
});
