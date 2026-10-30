import { fireEvent } from '@testing-library/react-native';

import { listBookmarks, toggleBookmark } from '@/features/library/data';
import type { ChapterRecord } from '@/features/reader/data/chapters';
import type { VerseRecord } from '@/features/reader/data/verses';

import { locales, renderUi } from '../../../../jest/render-ui';
import { openUserTestStore } from '../../../../jest/user-test-db';
import { BookmarkListCard } from './BookmarkListCard';

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

describe('BookmarkListCard', () => {
  it.each(locales)('draws the empty state with the open-mushaf action (%s)', async (locale) => {
    const onOpenMushaf = jest.fn();
    const view = await renderUi(
      <BookmarkListCard item={null} onOpenMushaf={onOpenMushaf} onOpenVerse={jest.fn()} />,
      { locale },
    );

    expect(view.getByText(locale === 'ar' ? 'لا توجد علامات بعد' : 'No bookmarks yet')).toBeOnTheScreen();

    fireEvent.press(view.getByRole('button', { name: locale === 'ar' ? 'افتح المصحف' : 'Open the Mushaf' }));

    expect(onOpenMushaf).toHaveBeenCalledTimes(1);
  });

  it('shows the one bookmark with its page and juz, and opens the reader on press', async () => {
    const { store } = openUserTestStore();
    toggleBookmark(262, store);
    const row = listBookmarks(store)[0]!;
    const onOpenVerse = jest.fn();
    const view = await renderUi(
      <BookmarkListCard item={{ row, verse, chapter }} onOpenMushaf={jest.fn()} onOpenVerse={onOpenVerse} store={store} />,
    );

    fireEvent.press(view.getByRole('button', { name: 'البقرة · الآية ٢٥٥, صفحة ٤٢ · الجزء ٣' }));

    expect(onOpenVerse).toHaveBeenCalledWith('2:255');
  });

  it('removes the bookmark through the repository', async () => {
    const { store } = openUserTestStore();
    toggleBookmark(262, store);
    const row = listBookmarks(store)[0]!;
    const view = await renderUi(
      <BookmarkListCard item={{ row, verse, chapter }} onOpenMushaf={jest.fn()} onOpenVerse={jest.fn()} store={store} />,
    );

    fireEvent.press(view.getByRole('button', { name: 'إزالة العلامة' }));

    expect(listBookmarks(store)).toEqual([]);
  });
});
