import { screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { DatabaseSync } from 'node:sqlite';

import { useContentDb } from '@/core/db/content/open';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { resetWindowSize, setWindowSize } from '../../../../jest/window-size';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { FIXTURE_MULTI, FIXTURE_SINGLE, loadHadithDevFixtures } from '../data/__fixtures__/dev-fixtures';
import { HadithCollectionScreen } from '../screens/HadithCollectionScreen';

import { HadithExpandedBrowser } from './HadithExpandedBrowser';

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
  useIsHadithBookmarked: jest.fn(() => false),
  toggleHadithBookmark: jest.fn(() => true),
  saveHadithReadingPlace: jest.fn(),
}));

const SLUG = FIXTURE_MULTI.slug;
// Frame HadithCollExpanded is 1194 x 834 (iPad landscape). A phone width is 390.
const EXPANDED = { width: 1194, height: 834 };
const PHONE = { width: 390, height: 844 };
const FIRST_BOOK_CHAPTER = 1;

describe('HadithExpandedBrowser', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;

  beforeEach(() => {
    jest.clearAllMocks();
    setWindowSize(EXPANDED.width, EXPANDED.height);
    const opened = openAzkarContentDb();
    database = opened.database;
    executor = opened.executor;
    mockOpen = () => ({ executor });
    loadHadithDevFixtures(executor);
    jest.mocked(useContentDb).mockReturnValue({ ready: true, error: null });
  });

  afterEach(() => {
    database.close();
    resetWindowSize();
  });

  it('shows the books on the start side and the first book chapters on the end side', async () => {
    await renderUi(<HadithExpandedBrowser initialBookId={null} initialNumber={null} slug={SLUG} />);
    expect(screen.getByTestId('hadith-expanded-browser-books-item-1')).toBeOnTheScreen();
    expect(screen.getByTestId('hadith-expanded-browser-books-item-3')).toBeOnTheScreen();
    expect(screen.getByTestId(`hadith-expanded-browser-chapters-item-${FIRST_BOOK_CHAPTER}`)).toBeOnTheScreen();
  });

  it('tapping a book changes the list without navigating', async () => {
    await renderUi(<HadithExpandedBrowser initialBookId={null} initialNumber={null} slug={SLUG} />);
    await press(screen.getByTestId('hadith-expanded-browser-books-item-2'));
    expect(screen.getByTestId('hadith-expanded-browser-hadith-item-3')).toBeOnTheScreen();
    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('tapping a hadith shows the reader and the details panel', async () => {
    await renderUi(<HadithExpandedBrowser initialBookId={2} initialNumber={null} slug={SLUG} />);
    await press(screen.getByTestId('hadith-expanded-browser-hadith-item-3'));
    expect(screen.getByTestId('hadith-reader-content-card-text')).toHaveTextContent(/FIXTURE text 3/);
    expect(screen.getByTestId('hadith-expanded-browser-details')).toBeOnTheScreen();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('previous and next change the hadith in place', async () => {
    await renderUi(<HadithExpandedBrowser initialBookId={null} initialNumber="2" slug={SLUG} />);
    expect(screen.getByTestId('hadith-reader-content-card-text')).toHaveTextContent(/FIXTURE text 2/);
    await press(screen.getByRole('button', { name: 'التالي' }));
    expect(screen.getByTestId('hadith-reader-content-card-text')).toHaveTextContent(/FIXTURE text 3/);
    await press(screen.getByRole('button', { name: 'السابق' }));
    expect(screen.getByTestId('hadith-reader-content-card-text')).toHaveTextContent(/FIXTURE text 2/);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('a single-book collection shows only the hadith list', async () => {
    await renderUi(<HadithExpandedBrowser initialBookId={null} initialNumber={null} slug={FIXTURE_SINGLE.slug} />);
    expect(screen.queryByTestId('hadith-expanded-browser-books')).toBeNull();
    expect(screen.getByTestId('hadith-expanded-browser-hadith-item-1')).toBeOnTheScreen();
  });

  it('phone-width windows render the phone screens', async () => {
    setWindowSize(PHONE.width, PHONE.height);
    await renderUi(<HadithCollectionScreen slug={SLUG} />);
    expect(screen.queryByTestId('hadith-expanded-browser')).toBeNull();
    expect(screen.getByTestId('hadith-book-list-item-1')).toBeOnTheScreen();
  });

  it('shows no grade text', async () => {
    await renderUi(<HadithExpandedBrowser initialBookId={null} initialNumber="2" slug={SLUG} />);
    expect(screen.queryByText(/grade/i)).toBeNull();
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithExpandedBrowser.tsx')).toEqual([]);
  });
});
