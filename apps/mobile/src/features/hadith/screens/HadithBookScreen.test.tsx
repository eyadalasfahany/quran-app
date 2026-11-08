import { act, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { DatabaseSync } from 'node:sqlite';

import { useContentDb } from '@/core/db/content/open';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { locales, renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { FIXTURE_MULTI, loadHadithDevFixtures } from '../data/__fixtures__/dev-fixtures';

import { HadithBookScreen } from './HadithBookScreen';

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
// Book 1 holds chapters (option C), book 2 is flat with a title, book 3 is flat and untitled. Ids from the fixture.
const CHAPTERED_BOOK = 1;
const FLAT_BOOK = 2;
const UNTITLED_FLAT_BOOK = 3;
const PAGE_EXTRA = 60;

// The FlatList instance behind the hadith list: the host node's nearest ancestor that carries `data`.
function listFlatList(): { props: { data: unknown[]; onEndReached: () => void } } {
  let node: { props: Record<string, unknown>; parent: unknown } | null = screen.getByTestId('hadith-hadith-list');
  while (node !== null && !('data' in node.props)) {
    node = node.parent as typeof node;
  }
  if (node === null) {
    throw new Error('No FlatList above the hadith list.');
  }
  return node as unknown as { props: { data: unknown[]; onEndReached: () => void } };
}

function listData(): unknown[] {
  return listFlatList().props.data;
}

describe('HadithBookScreen', () => {
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

  it('a book without chapters lists its hadith', async () => {
    await renderUi(<HadithBookScreen bookId={FLAT_BOOK} slug={SLUG} />);
    expect(screen.getByTestId('hadith-hadith-list-item-3')).toBeOnTheScreen();
    expect(screen.getByTestId('hadith-hadith-list-item-5')).toBeOnTheScreen();
  });

  it('a book with chapters lists its chapters and no hadith', async () => {
    await renderUi(<HadithBookScreen bookId={CHAPTERED_BOOK} slug={SLUG} />);
    expect(screen.getByTestId('hadith-chapter-list-item-1')).toBeOnTheScreen();
    expect(screen.getByTestId('hadith-chapter-list-item-2')).toBeOnTheScreen();
    expect(screen.queryByTestId('hadith-hadith-list')).toBeNull();
  });

  it('a chapter row with one hadith opens that hadith straight away', async () => {
    await renderUi(<HadithBookScreen bookId={CHAPTERED_BOOK} slug={SLUG} />);
    await press(screen.getByTestId('hadith-chapter-list-item-2'));
    expect(router.push).toHaveBeenCalledWith(`/hadith/${SLUG}/hadith/2`);
  });

  it('a chapter row with more than one hadith opens the chapter list', async () => {
    executor.run('UPDATE hadith_chapters SET hadith_count = 2 WHERE id = 2');
    await renderUi(<HadithBookScreen bookId={CHAPTERED_BOOK} slug={SLUG} />);
    await press(screen.getByTestId('hadith-chapter-list-item-2'));
    expect(router.push).toHaveBeenCalledWith(`/hadith/${SLUG}/books/${CHAPTERED_BOOK}/chapters/2`);
  });

  it('a hadith card opens the reader', async () => {
    await renderUi(<HadithBookScreen bookId={FLAT_BOOK} slug={SLUG} />);
    await press(screen.getByTestId('hadith-hadith-list-item-3'));
    expect(router.push).toHaveBeenCalledWith(`/hadith/${SLUG}/hadith/3`);
  });

  it('shows the book title and count in the header', async () => {
    await renderUi(<HadithBookScreen bookId={FLAT_BOOK} slug={SLUG} />);
    expect(screen.getByTestId('hadith-list-header-title')).toHaveTextContent('[عنوان تجريبي]');
    expect(screen.getByTestId('hadith-list-header-subtitle')).toHaveTextContent(/٣ أحاديث$/);
  });

  it('shows «كتاب n» for an untitled book', async () => {
    await renderUi(<HadithBookScreen bookId={UNTITLED_FLAT_BOOK} slug={SLUG} />);
    expect(screen.getByTestId('hadith-list-header-title')).toHaveTextContent('كتاب ٣');
  });

  it('shows not-found for an unknown or non-numeric book id', async () => {
    await renderUi(<HadithBookScreen bookId={999} slug={SLUG} />);
    expect(screen.getByText('المحتوى غير متوفر')).toBeOnTheScreen();
  });

  it('shows not-found when the route id is not a number', async () => {
    await renderUi(<HadithBookScreen bookId={null} slug={SLUG} />);
    expect(screen.getByText('المحتوى غير متوفر')).toBeOnTheScreen();
  });

  it('loads the next page near the end', async () => {
    for (let index = 0; index < PAGE_EXTRA; index += 1) {
      executor.run(
        `INSERT INTO hadith_entries (resource_id, id, book_id, chapter_id, hadith_number, arabic_number, position, text_ar,
                                     text_en, narrator_en, text_search, source_url)
         VALUES (?, ?, ?, NULL, ?, NULL, ?, ?, NULL, NULL, ?, NULL)`,
        [FIXTURE_MULTI.resourceId, 1000 + index, FLAT_BOOK, String(100 + index), 100 + index, 'FIXTURE text bulk — not a hadith', 'bulk'],
      );
    }
    await renderUi(<HadithBookScreen bookId={FLAT_BOOK} slug={SLUG} />);
    expect(listData()).toHaveLength(50);
    await act(async () => {
      listFlatList().props.onEndReached();
    });
    expect(listData()).toHaveLength(3 + PAGE_EXTRA);
  });

  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderUi(<HadithBookScreen bookId={FLAT_BOOK} slug={SLUG} />, { locale });
    expect(screen.getByTestId('screen-hadith-book')).toBeOnTheScreen();
  });
});
