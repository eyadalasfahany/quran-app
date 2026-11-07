import { screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { DatabaseSync } from 'node:sqlite';

import { useContentDb } from '@/core/db/content/open';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { locales, renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { FIXTURE_MULTI, loadHadithDevFixtures } from '../data/__fixtures__/dev-fixtures';

import { HadithChapterScreen } from './HadithChapterScreen';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
}));

let mockOpen: () => { executor: SqlExecutor } = () => {
  throw new Error('The content database is not open.');
};

jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => mockOpen(),
  useContentDb: jest.fn(() => ({ ready: true, error: null })),
}));

jest.mock('../personal', () => ({
  useHadithBookmarks: jest.fn(() => []),
}));

const SLUG = FIXTURE_MULTI.slug;
const BOOK = 1;
// Chapter 1 is untitled (باب ١) and holds hadith 1; chapter 2 has the placeholder title and holds hadith 2.
const FIRST_CHAPTER = 1;
const TITLED_CHAPTER = 2;

describe('HadithChapterScreen', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;

  beforeEach(() => {
    jest.clearAllMocks();
    const opened = openAzkarContentDb();
    database = opened.database;
    executor = opened.executor;
    mockOpen = () => ({ executor });
    loadHadithDevFixtures(executor);
    jest.mocked(useContentDb).mockReturnValue({ ready: true, error: null });
  });

  afterEach(() => {
    database.close();
  });

  it("lists the chapter's hadith in order", async () => {
    await renderUi(<HadithChapterScreen bookId={BOOK} chapterId={FIRST_CHAPTER} slug={SLUG} />);
    expect(screen.getByTestId('hadith-hadith-list-item-1')).toBeOnTheScreen();
    expect(screen.queryByTestId('hadith-hadith-list-item-2')).toBeNull();
  });

  it('shows the Arabic chapter title in the English UI', async () => {
    await renderUi(<HadithChapterScreen bookId={BOOK} chapterId={TITLED_CHAPTER} slug={SLUG} />, { locale: 'en' });
    expect(screen.getByTestId('hadith-list-header-title')).toHaveTextContent('[عنوان تجريبي]');
  });

  it('shows not-found for an unknown chapter', async () => {
    await renderUi(<HadithChapterScreen bookId={BOOK} chapterId={999} slug={SLUG} />);
    expect(screen.getByText('المحتوى غير متوفر')).toBeOnTheScreen();
  });

  it('a hadith card opens the reader', async () => {
    await renderUi(<HadithChapterScreen bookId={BOOK} chapterId={FIRST_CHAPTER} slug={SLUG} />);
    await press(screen.getByTestId('hadith-hadith-list-item-1'));
    expect(router.push).toHaveBeenCalledWith(`/hadith/${SLUG}/hadith/1`);
  });

  it('back returns to the book', async () => {
    await renderUi(<HadithChapterScreen bookId={BOOK} chapterId={FIRST_CHAPTER} slug={SLUG} />);
    await press(screen.getByRole('button', { name: 'رجوع' }));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderUi(<HadithChapterScreen bookId={BOOK} chapterId={FIRST_CHAPTER} slug={SLUG} />, { locale });
    expect(screen.getByTestId('screen-hadith-chapter')).toBeOnTheScreen();
  });
});
