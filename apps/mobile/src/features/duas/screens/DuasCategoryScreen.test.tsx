import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { hadithHref } from '@/features/hadith/routes';

import { renderUi } from '../../../../jest/render-ui';
import * as duasHooks from '../data/hooks';
import type { DuaCategory, DuaCategoryItem } from '../data/model';
import { DuasCategoryScreen } from './DuasCategoryScreen';

const mockedDuasHooks = duasHooks as jest.Mocked<typeof duasHooks>;

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('../data/hooks', () => ({
  useDuaCategories: jest.fn(),
  useDuaCategoryItems: jest.fn(),
  useDuaTopics: jest.fn(),
}));

// Fixture text only: no dua, verse or hadith is written here.
const QURAN: DuaCategory = { id: 'quran', kind: 'quran', titleKey: 'duas.categories.quran', title: null, count: 2, sourceKind: 'duas' };
const HADITH_GROUP: DuaCategory = {
  id: 'hadeethenc:3',
  kind: 'hadeethenc',
  titleKey: null,
  title: 'FIXTURE group title',
  count: 2,
  sourceKind: 'duas',
};
const HISN: DuaCategory = { id: 'hisn:morning', kind: 'hisn', titleKey: 'azkar.categories.morning', title: null, count: 2, sourceKind: 'azkar' };

const QURAN_ITEMS: DuaCategoryItem[] = [
  { kind: 'quran', duaKey: 'quran:1:1', quranReference: 'FIXTURE surah · ١', text: 'FIXTURE quran text 1 — not a dua' },
  { kind: 'quran', duaKey: 'quran:2:3', quranReference: null, text: 'FIXTURE quran text 2 — not a dua' },
];
const HADITH_ITEMS: DuaCategoryItem[] = [{ kind: 'hadith', duaKey: 'hadeethenc:3', preview: 'FIXTURE preview 1 — not a dua' }];
const HISN_ITEMS: DuaCategoryItem[] = [
  {
    kind: 'hisn',
    entryKey: 'FIXTURE:entry-1',
    chapterTitle: 'FIXTURE chapter',
    preview: 'FIXTURE preview 2 — not a dua',
    quranRefs: [],
    bookNumber: '150',
  },
];

const SOURCE_TEXT = /المصادر|حصن المسلم|HadeethEnc|Hisn|القرآن الكريم ·|القرآن ·|· القرآن/;

function setup(category: DuaCategory | undefined, items: DuaCategoryItem[]) {
  mockedDuasHooks.useDuaTopics.mockReturnValue([]);
  mockedDuasHooks.useDuaCategories.mockReturnValue(category ? [category] : []);
  mockedDuasHooks.useDuaCategoryItems.mockReturnValue(items);
}

describe('DuasCategoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('topic (ADR 0092 decision 10)', () => {
    const TOPIC_ITEMS: DuaCategoryItem[] = [
      { kind: 'quran', duaKey: 'quran:2:128', quranReference: 'FIXTURE ref', text: 'FIXTURE quran text topic' },
      {
        kind: 'hadith-chapter',
        slug: 'bukhari',
        bookNumber: '80',
        chapterNumber: 3,
        bookId: 80,
        chapterId: 12,
        title: 'FIXTURE chapter title',
        count: 4,
      },
      {
        kind: 'hisn',
        entryKey: 'FIXTURE:entry-9',
        chapterTitle: null,
        preview: 'FIXTURE preview topic',
        quranRefs: [],
        bookNumber: '9',
      },
    ];

    beforeEach(() => {
      mockedDuasHooks.useDuaCategories.mockReturnValue([]);
      mockedDuasHooks.useDuaTopics.mockReturnValue([{ id: 'prayer', count: 3 }]);
      mockedDuasHooks.useDuaCategoryItems.mockReturnValue(TOPIC_ITEMS);
    });

    it('titles the screen with the topic name and its count, from the topic list', async () => {
      await renderUi(<DuasCategoryScreen categoryId="topic:prayer" />);

      expect(screen.getByRole('header', { name: 'الصلاة' })).toBeOnTheScreen();
      expect(screen.getByText('٣ أدعية')).toBeOnTheScreen();
    });

    it('shows one card per item across the sources, numbered in the topic order', async () => {
      await renderUi(<DuasCategoryScreen categoryId="topic:prayer" />);

      expect(screen.getByRole('button', { name: '١, FIXTURE quran text topic, FIXTURE ref' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: '٢, FIXTURE chapter title' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: '٣, FIXTURE preview topic' })).toBeOnTheScreen();
    });

    it('opens the hadith chapter for a chapter card, in the hadith reader', async () => {
      await renderUi(<DuasCategoryScreen categoryId="topic:prayer" />);

      await fireEvent.press(screen.getByRole('button', { name: '٢, FIXTURE chapter title' }));
      expect(router.push).toHaveBeenCalledWith(hadithHref.chapter('bukhari', 80, 12));
    });

    it('opens the Duas detail, paged within the topic, for a Quranic or Hisn card', async () => {
      await renderUi(<DuasCategoryScreen categoryId="topic:prayer" />);

      await fireEvent.press(screen.getByRole('button', { name: '٣, FIXTURE preview topic' }));
      expect(router.push).toHaveBeenCalledWith('/duas/category/topic%3Aprayer/2');
    });

    it('shows the Duas title for a topic that is not listed', async () => {
      mockedDuasHooks.useDuaTopics.mockReturnValue([]);
      await renderUi(<DuasCategoryScreen categoryId="topic:unknown" />);

      expect(screen.getByRole('header', { name: 'الأدعية' })).toBeOnTheScreen();
    });
  });

  describe('quran category', () => {
    it('titles the screen with the category name and its count only', async () => {
      setup(QURAN, QURAN_ITEMS);
      await renderUi(<DuasCategoryScreen categoryId="quran" />);

      expect(screen.getByRole('header', { name: 'من القرآن الكريم' })).toBeOnTheScreen();
      expect(screen.getByText('دعاءان')).toBeOnTheScreen();
    });

    it('shows one card per dua with its verse text and reference', async () => {
      setup(QURAN, QURAN_ITEMS);
      await renderUi(<DuasCategoryScreen categoryId="quran" />);

      expect(screen.getByRole('button', { name: '١, FIXTURE quran text 1 — not a dua, FIXTURE surah · ١' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: '٢, FIXTURE quran text 2 — not a dua, من القرآن الكريم' })).toBeOnTheScreen();
    });

    it('opens the Quranic detail from a card', async () => {
      setup(QURAN, QURAN_ITEMS);
      await renderUi(<DuasCategoryScreen categoryId="quran" />);

      await fireEvent.press(screen.getByRole('button', { name: '١, FIXTURE quran text 1 — not a dua, FIXTURE surah · ١' }));
      expect(router.push).toHaveBeenCalledWith('/duas/category/quran/0');
    });

    it('shows no source text on the screen', async () => {
      setup(QURAN, QURAN_ITEMS);
      await renderUi(<DuasCategoryScreen categoryId="quran" />);

      expect(screen.queryByText(SOURCE_TEXT)).toBeNull();
    });
  });

  describe('hadeethenc category', () => {
    it('titles the screen with the group title as received, and the count only', async () => {
      setup(HADITH_GROUP, HADITH_ITEMS);
      await renderUi(<DuasCategoryScreen categoryId="hadeethenc:3" />);

      expect(screen.getByRole('header', { name: 'FIXTURE group title' })).toBeOnTheScreen();
      expect(screen.getByText('دعاءان')).toBeOnTheScreen();
    });

    it('shows the preview clamped to two lines, labelled with its position', async () => {
      setup(HADITH_GROUP, HADITH_ITEMS);
      await renderUi(<DuasCategoryScreen categoryId="hadeethenc:3" />);

      const preview = screen.getByText('FIXTURE preview 1 — not a dua');
      expect(preview.props.numberOfLines).toBe(2);
      expect(screen.getByRole('button', { name: '١, FIXTURE preview 1 — not a dua' })).toBeOnTheScreen();
    });

    it('opens the prophetic detail from a card, at its position in the category', async () => {
      setup(HADITH_GROUP, HADITH_ITEMS);
      await renderUi(<DuasCategoryScreen categoryId="hadeethenc:3" />);

      await fireEvent.press(screen.getByRole('button', { name: '١, FIXTURE preview 1 — not a dua' }));
      expect(router.push).toHaveBeenCalledWith('/duas/category/hadeethenc%3A3/0');
    });

    it('shows no source text on the screen', async () => {
      setup(HADITH_GROUP, HADITH_ITEMS);
      await renderUi(<DuasCategoryScreen categoryId="hadeethenc:3" />);

      expect(screen.queryByText(SOURCE_TEXT)).toBeNull();
    });
  });

  describe('hadith book category (ADR 0091 part 4)', () => {
    const BOOK: DuaCategory = {
      id: 'hadithbook:bukhari:80',
      kind: 'hadithbook',
      titleKey: null,
      title: 'FIXTURE book title',
      count: 2,
      sourceKind: 'hadith',
      bookNumber: '80',
    };
    const BOOK_ITEMS: DuaCategoryItem[] = [
      { kind: 'hadith-entry', slug: 'bukhari', hadithNumber: '80.1', preview: 'FIXTURE hadith text 80.1' },
      { kind: 'hadith-entry', slug: 'bukhari', hadithNumber: '80.2', preview: 'FIXTURE hadith text 80.2' },
    ];

    it('titles the screen with the book title and the count only', async () => {
      setup(BOOK, BOOK_ITEMS);
      await renderUi(<DuasCategoryScreen categoryId="hadithbook:bukhari:80" />);

      expect(screen.getByRole('header', { name: 'FIXTURE book title' })).toBeOnTheScreen();
      expect(screen.getByText('دعاءان')).toBeOnTheScreen();
    });

    it('shows one card per hadith with its number and its text, clamped to two lines', async () => {
      setup(BOOK, BOOK_ITEMS);
      await renderUi(<DuasCategoryScreen categoryId="hadithbook:bukhari:80" />);

      const text = screen.getByText('FIXTURE hadith text 80.1');
      expect(text.props.numberOfLines).toBe(2);
      expect(screen.getByRole('button', { name: '١, FIXTURE hadith text 80.1' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: '٢, FIXTURE hadith text 80.2' })).toBeOnTheScreen();
    });

    it('opens the hadith reader for the hadith a card shows', async () => {
      setup(BOOK, BOOK_ITEMS);
      await renderUi(<DuasCategoryScreen categoryId="hadithbook:bukhari:80" />);

      await fireEvent.press(screen.getByRole('button', { name: '٢, FIXTURE hadith text 80.2' }));
      expect(router.push).toHaveBeenCalledWith('/hadith/bukhari/hadith/80.2');
    });

    it('shows the fallback name for a book with no Arabic title', async () => {
      setup({ ...BOOK, title: null, bookNumber: '48', id: 'hadithbook:muslim:48' }, []);
      await renderUi(<DuasCategoryScreen categoryId="hadithbook:muslim:48" />);

      expect(screen.getByRole('header', { name: 'كتاب ٤٨' })).toBeOnTheScreen();
    });

    it('shows no source text on the screen', async () => {
      setup(BOOK, BOOK_ITEMS);
      await renderUi(<DuasCategoryScreen categoryId="hadithbook:bukhari:80" />);

      expect(screen.queryByText(SOURCE_TEXT)).toBeNull();
      expect(screen.queryByText(/صحيح البخاري|Bukhari/)).toBeNull();
    });
  });

  describe('hisn category', () => {
    it('titles the screen with the localised topic name and the count only', async () => {
      setup(HISN, HISN_ITEMS);
      await renderUi(<DuasCategoryScreen categoryId="hisn:morning" />);

      expect(screen.getByRole('header', { name: 'أذكار الصباح' })).toBeOnTheScreen();
      expect(screen.getByText('دعاءان')).toBeOnTheScreen();
    });

    it('shows the preview only: no chapter title, no source caption, no book number', async () => {
      setup(HISN, HISN_ITEMS);
      await renderUi(<DuasCategoryScreen categoryId="hisn:morning" />);

      expect(screen.getByText('FIXTURE preview 2 — not a dua')).toBeOnTheScreen();
      expect(screen.queryByText('FIXTURE chapter')).toBeNull();
      expect(screen.queryByText(/١٥٠|150/)).toBeNull();
      expect(screen.getByRole('button', { name: '١, FIXTURE preview 2 — not a dua' })).toBeOnTheScreen();
    });

    it('opens the Duas detail for the card, not the Azkar reader (ADR 0091 decision 11)', async () => {
      setup(HISN, HISN_ITEMS);
      await renderUi(<DuasCategoryScreen categoryId="hisn:morning" />);

      await fireEvent.press(screen.getByRole('button', { name: '١, FIXTURE preview 2 — not a dua' }));
      expect(router.push).toHaveBeenCalledWith('/duas/category/hisn%3Amorning/0');
    });

    it('shows no source text on the screen, in English either', async () => {
      setup(HISN, HISN_ITEMS);
      await renderUi(<DuasCategoryScreen categoryId="hisn:morning" />, { locale: 'en' });

      expect(screen.queryByText(SOURCE_TEXT)).toBeNull();
      expect(screen.queryByText(/Hisn al-Muslim/)).toBeNull();
      expect(screen.getByRole('button', { name: '1, FIXTURE preview 2 — not a dua' })).toBeOnTheScreen();
    });
  });

  it('shows the Duas title and no cards for an unknown category', async () => {
    setup(undefined, []);
    await renderUi(<DuasCategoryScreen categoryId="hisn:unknown" />);

    expect(screen.getByRole('header', { name: 'الأدعية' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /،/ })).toBeNull();
  });

  it('goes back to Duas home from the header', async () => {
    setup(QURAN, QURAN_ITEMS);
    await renderUi(<DuasCategoryScreen categoryId="quran" />);

    await fireEvent.press(screen.getByRole('button', { name: 'رجوع' }));
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
