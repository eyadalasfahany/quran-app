import { screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { DatabaseSync } from 'node:sqlite';

import { useContentDb } from '@/core/db/content/open';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { locales, renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { FIXTURE_MULTI, FIXTURE_SINGLE, loadHadithDevFixtures } from '../data/__fixtures__/dev-fixtures';

import { HadithCollectionScreen } from './HadithCollectionScreen';

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

const UNKNOWN_SLUG = 'not-installed';

describe('HadithCollectionScreen', () => {
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

  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderUi(<HadithCollectionScreen slug={FIXTURE_SINGLE.slug} />, { locale });
    expect(screen.getByTestId('screen-hadith-collection')).toBeOnTheScreen();
  });

  it('multi-book: shows the centred header and one row per book', async () => {
    await renderUi(<HadithCollectionScreen slug={FIXTURE_MULTI.slug} />);
    expect(screen.getByTestId('collection-header')).toBeOnTheScreen();
    expect(screen.getByTestId('hadith-book-list-item-1')).toBeOnTheScreen();
    expect(screen.getByTestId('hadith-book-list-item-2')).toBeOnTheScreen();
    expect(screen.getByTestId('hadith-book-list-item-3')).toBeOnTheScreen();
  });

  it('multi-book: a book row opens the book', async () => {
    await renderUi(<HadithCollectionScreen slug={FIXTURE_MULTI.slug} />);
    await press(screen.getByTestId('hadith-book-list-item-2'));
    expect(router.push).toHaveBeenCalledWith(`/hadith/${FIXTURE_MULTI.slug}/books/2`);
  });

  it('single-book: shows the inline header and the hadith list directly', async () => {
    await renderUi(<HadithCollectionScreen slug={FIXTURE_SINGLE.slug} />);
    expect(screen.getByTestId('collection-header-counts')).toBeOnTheScreen();
    expect(screen.getByTestId('hadith-hadith-list-item-1')).toBeOnTheScreen();
  });

  it('single-book: a hadith card opens the reader', async () => {
    await renderUi(<HadithCollectionScreen slug={FIXTURE_SINGLE.slug} />);
    await press(screen.getByTestId('hadith-hadith-list-item-1'));
    expect(router.push).toHaveBeenCalledWith(`/hadith/${FIXTURE_SINGLE.slug}/hadith/1`);
  });

  it('single-book: does not render a books list', async () => {
    await renderUi(<HadithCollectionScreen slug={FIXTURE_SINGLE.slug} />);
    expect(screen.queryByTestId('hadith-book-list')).toBeNull();
  });

  it('decides single-book from soleBookId, not from the slug', async () => {
    await renderUi(<HadithCollectionScreen slug={FIXTURE_MULTI.slug} />);
    expect(screen.getByTestId('hadith-book-list')).toBeOnTheScreen();
    expect(screen.queryByTestId('hadith-hadith-list')).toBeNull();
  });

  it('shows the numbered fallback for an untitled collection', async () => {
    await renderUi(<HadithCollectionScreen slug={FIXTURE_MULTI.slug} />);
    expect(screen.getByTestId('collection-header-title')).toHaveTextContent(/^مجموعة [٠-٩]+$/);
  });

  it('shows not-found for a collection that is not installed', async () => {
    await renderUi(<HadithCollectionScreen slug={UNKNOWN_SLUG} />);
    expect(screen.getByText('المحتوى غير متوفر')).toBeOnTheScreen();
  });

  it('shows the loading state before the content database is ready', async () => {
    jest.mocked(useContentDb).mockReturnValue({ ready: false, error: null });
    await renderUi(<HadithCollectionScreen slug={FIXTURE_MULTI.slug} />);
    expect(screen.getByLabelText('جارٍ التحميل')).toBeOnTheScreen();
  });

  it('the search button opens search', async () => {
    await renderUi(<HadithCollectionScreen slug={FIXTURE_MULTI.slug} />);
    await press(screen.getByRole('button', { name: 'بحث في الحديث' }));
    expect(router.push).toHaveBeenCalledWith('/hadith/search');
  });

  it('shows no grade text', async () => {
    await renderUi(<HadithCollectionScreen slug={FIXTURE_MULTI.slug} />);
    expect(screen.queryByText(/grade/i)).toBeNull();
  });
});
