import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

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
  { kind: 'quran', duaKey: 'quran:1:1', quranReference: 'FIXTURE surah · ١' },
  { kind: 'quran', duaKey: 'quran:2:3', quranReference: null },
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

function setup(category: DuaCategory | undefined, items: DuaCategoryItem[]) {
  mockedDuasHooks.useDuaCategories.mockReturnValue(category ? [category] : []);
  mockedDuasHooks.useDuaCategoryItems.mockReturnValue(items);
}

describe('DuasCategoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('quran category', () => {
    it('titles the screen with the category name and its count and source', async () => {
      setup(QURAN, QURAN_ITEMS);
      await renderUi(<DuasCategoryScreen categoryId="quran" />);

      expect(screen.getByRole('header', { name: 'من القرآن الكريم' })).toBeOnTheScreen();
      expect(screen.getByText('دعاءان · القرآن')).toBeOnTheScreen();
    });

    it('shows one card per dua with its reference as the title, and no Quran text', async () => {
      setup(QURAN, QURAN_ITEMS);
      await renderUi(<DuasCategoryScreen categoryId="quran" />);

      expect(screen.getByRole('button', { name: '١، FIXTURE surah · ١' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: '٢، من القرآن الكريم' })).toBeOnTheScreen();
    });

    it('opens the Quranic detail from a card', async () => {
      setup(QURAN, QURAN_ITEMS);
      await renderUi(<DuasCategoryScreen categoryId="quran" />);

      await fireEvent.press(screen.getByRole('button', { name: '١، FIXTURE surah · ١' }));
      expect(router.push).toHaveBeenCalledWith('/duas/quran/quran%3A1%3A1');
    });
  });

  describe('hadeethenc category', () => {
    it('titles the screen with the group title as received', async () => {
      setup(HADITH_GROUP, HADITH_ITEMS);
      await renderUi(<DuasCategoryScreen categoryId="hadeethenc:3" />);

      expect(screen.getByRole('header', { name: 'FIXTURE group title' })).toBeOnTheScreen();
      expect(screen.getByText('دعاءان · HadeethEnc')).toBeOnTheScreen();
    });

    it('shows the preview clamped to two lines, labelled with its position', async () => {
      setup(HADITH_GROUP, HADITH_ITEMS);
      await renderUi(<DuasCategoryScreen categoryId="hadeethenc:3" />);

      const preview = screen.getByText('FIXTURE preview 1 — not a dua');
      expect(preview.props.numberOfLines).toBe(2);
      expect(screen.getByRole('button', { name: '١، FIXTURE preview 1 — not a dua' })).toBeOnTheScreen();
    });

    it('opens the prophetic detail from a card', async () => {
      setup(HADITH_GROUP, HADITH_ITEMS);
      await renderUi(<DuasCategoryScreen categoryId="hadeethenc:3" />);

      await fireEvent.press(screen.getByRole('button', { name: '١، FIXTURE preview 1 — not a dua' }));
      expect(router.push).toHaveBeenCalledWith('/duas/hadith/hadeethenc%3A3');
    });
  });

  describe('hisn category', () => {
    it('titles the screen with the localised topic name and the Hisn source', async () => {
      setup(HISN, HISN_ITEMS);
      await renderUi(<DuasCategoryScreen categoryId="hisn:morning" />);

      expect(screen.getByRole('header', { name: 'أذكار الصباح' })).toBeOnTheScreen();
      expect(screen.getByText('دعاءان · حصن المسلم')).toBeOnTheScreen();
    });

    it('shows the chapter title, the preview and the source with its book number', async () => {
      setup(HISN, HISN_ITEMS);
      await renderUi(<DuasCategoryScreen categoryId="hisn:morning" />);

      expect(screen.getByText('FIXTURE chapter')).toBeOnTheScreen();
      expect(screen.getByText('FIXTURE preview 2 — not a dua')).toBeOnTheScreen();
      expect(screen.getByText('حصن المسلم · ١٥٠')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: '١، FIXTURE chapter' })).toBeOnTheScreen();
    });

    it('opens the Azkar entry from a card (ADR 0091 §3)', async () => {
      setup(HISN, HISN_ITEMS);
      await renderUi(<DuasCategoryScreen categoryId="hisn:morning" />);

      await fireEvent.press(screen.getByRole('button', { name: '١، FIXTURE chapter' }));
      expect(router.push).toHaveBeenCalledWith('/azkar/entry/FIXTURE%3Aentry-1');
    });

    it('shows the source in English with the Western book number', async () => {
      setup(HISN, HISN_ITEMS);
      await renderUi(<DuasCategoryScreen categoryId="hisn:morning" />, { locale: 'en' });

      expect(screen.getByText('Hisn al-Muslim · 150')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: '1, FIXTURE chapter' })).toBeOnTheScreen();
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
