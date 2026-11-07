import { screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { DatabaseSync } from 'node:sqlite';

import { useContentDb } from '@/core/db/content/open';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { locales, renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { FIXTURE_MULTI, loadHadithDevFixtures } from '../data/__fixtures__/dev-fixtures';

import { HadithRunScreen } from './HadithRunScreen';

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
const BOOK = 10;
const RUN_FROM = 3;
const RUN_TO = 4;

/**
 * Book 10 of the first fixture collection: a chapter (hadith 2) between two runs. Run 1 is hadith 1 before the
 * chapter; the run from position 3 to 4 is hadith 4 and a placeholder 5. Placeholder text only.
 */
function insertRunBook(executor: SqlExecutor): void {
  executor.run(
    `INSERT INTO hadith_books (resource_id, id, book_number, title_ar, title_en, position, hadith_count)
     VALUES (-1, ?, '10', NULL, NULL, 10, 4)`,
    [BOOK],
  );
  executor.run(
    `INSERT INTO hadith_chapters (resource_id, id, book_id, chapter_number, source_chapter_key, title_ar, title_en, position, hadith_count)
     VALUES (-1, 21, ?, 1, NULL, '[عنوان تجريبي]', NULL, 1, 1)`,
    [BOOK],
  );
  const rows: [number, number, number | null, string, string, string | null][] = [
    [201, 1, null, '1', 'FIXTURE text 1 — not a hadith', null],
    [202, 2, 21, '2', 'FIXTURE text 2 — not a hadith', null],
    [203, 3, null, '4', 'FIXTURE text 4 — not a hadith', null],
    [204, 4, null, '5', '', 'unavailable'],
  ];
  for (const [id, position, chapterId, hadithNumber, textAr, sourceCode] of rows) {
    executor.run(
      `INSERT INTO hadith_entries (resource_id, id, book_id, chapter_id, hadith_number, arabic_number, position, text_ar,
                                   text_en, narrator_en, text_search, source_url, number_first, number_last, source_code)
       VALUES (-1, ?, ?, ?, ?, NULL, ?, ?, NULL, NULL, ?, NULL, NULL, NULL, ?)`,
      [id, BOOK, chapterId, hadithNumber, position, textAr, textAr, sourceCode],
    );
  }
}

describe('HadithRunScreen', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;

  beforeEach(() => {
    jest.clearAllMocks();
    const opened = openAzkarContentDb();
    database = opened.database;
    executor = opened.executor;
    mockOpen = () => ({ executor });
    loadHadithDevFixtures(executor);
    insertRunBook(executor);
    jest.mocked(useContentDb).mockReturnValue({ ready: true, error: null });
  });

  afterEach(() => {
    database.close();
  });

  it('lists the hadith of the run, placeholders included', async () => {
    await renderUi(<HadithRunScreen bookId={BOOK} from={RUN_FROM} slug={SLUG} to={RUN_TO} />);
    expect(screen.getByTestId('hadith-hadith-list-item-203')).toBeOnTheScreen();
    expect(screen.getByTestId('hadith-hadith-list-item-204')).toBeOnTheScreen();
    expect(screen.queryByTestId('hadith-hadith-list-item-201')).toBeNull();
  });

  it('shows the range title in Arabic digits', async () => {
    await renderUi(<HadithRunScreen bookId={BOOK} from={RUN_FROM} slug={SLUG} to={RUN_TO} />);
    expect(screen.getByTestId('hadith-list-header-title')).toHaveTextContent('أحاديث ٤–٥');
  });

  it('shows the range title in English', async () => {
    await renderUi(<HadithRunScreen bookId={BOOK} from={RUN_FROM} slug={SLUG} to={RUN_TO} />, { locale: 'en' });
    expect(screen.getByTestId('hadith-list-header-title')).toHaveTextContent('Hadith 4–5');
  });

  it('a hadith card opens the reader', async () => {
    await renderUi(<HadithRunScreen bookId={BOOK} from={RUN_FROM} slug={SLUG} to={RUN_TO} />);
    await press(screen.getByTestId('hadith-hadith-list-item-203'));
    expect(router.push).toHaveBeenCalledWith(`/hadith/${SLUG}/hadith/4`);
  });

  it('shows not-found for a range that is not a run of the book', async () => {
    await renderUi(<HadithRunScreen bookId={BOOK} from={1} slug={SLUG} to={9} />);
    expect(screen.getByText('المحتوى غير متوفر')).toBeOnTheScreen();
  });

  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderUi(<HadithRunScreen bookId={BOOK} from={RUN_FROM} slug={SLUG} to={RUN_TO} />, { locale });
    expect(screen.getByTestId('screen-hadith-run')).toBeOnTheScreen();
  });
});
