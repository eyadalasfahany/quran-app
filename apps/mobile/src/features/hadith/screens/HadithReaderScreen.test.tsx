import { act, screen } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { AccessibilityInfo, Share } from 'react-native';
import { router } from 'expo-router';
import type { DatabaseSync } from 'node:sqlite';

import { useContentDb } from '@/core/db/content/open';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { locales, renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { FIXTURE_MULTI, FIXTURE_SINGLE, loadHadithDevFixtures } from '../data/__fixtures__/dev-fixtures';
import { saveHadithReadingPlace, toggleHadithBookmark, useIsHadithBookmarked } from '../personal';

import { HadithReaderScreen } from './HadithReaderScreen';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));

let mockOpen: () => { executor: SqlExecutor } = () => {
  throw new Error('The content database is not open.');
};

jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => mockOpen(),
  useContentDb: jest.fn(() => ({ ready: true, error: null })),
}));

jest.mock('../personal', () => ({
  useIsHadithBookmarked: jest.fn(() => false),
  toggleHadithBookmark: jest.fn(() => true),
  saveHadithReadingPlace: jest.fn(),
}));

const SLUG = FIXTURE_MULTI.slug;

describe('HadithReaderScreen', () => {
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
    jest.mocked(useIsHadithBookmarked).mockReturnValue(false);
  });

  afterEach(() => {
    database.close();
  });

  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderUi(<HadithReaderScreen hadithNumber="2" slug={SLUG} />, { locale });
    expect(screen.getByTestId('screen-hadith-reader')).toBeOnTheScreen();
  });

  it('shows the number label, the text and the source line without a link', async () => {
    await renderUi(<HadithReaderScreen hadithNumber="2" slug={SLUG} />);
    expect(screen.getByText('حديث رقم ٢')).toBeOnTheScreen();
    expect(screen.getByTestId('hadith-reader-content-card-text')).toHaveTextContent(/FIXTURE text 2/);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('shows the fallback titles when the collection and book are untitled', async () => {
    await renderUi(<HadithReaderScreen hadithNumber="5" slug={SLUG} />);
    expect(screen.getByTestId('hadith-reader-header-breadcrumb')).toHaveTextContent(/كتاب ٣/);
  });

  it('the bookmark button saves and removes the hadith by slug and number', async () => {
    await renderUi(<HadithReaderScreen hadithNumber="2" slug={SLUG} />);
    await press(screen.getByRole('button', { name: 'حفظ الحديث' }));
    expect(toggleHadithBookmark).toHaveBeenCalledWith({ slug: SLUG, hadithNumber: '2', bookNumber: '1' });
  });

  it('the bookmark state is read from the live hook', async () => {
    jest.mocked(useIsHadithBookmarked).mockReturnValue(true);
    await renderUi(<HadithReaderScreen hadithNumber="2" slug={SLUG} />);
    expect(screen.getByRole('button', { name: 'إزالة من المحفوظات' })).toBeOnTheScreen();
    expect(useIsHadithBookmarked).toHaveBeenCalledWith(SLUG, '2');
  });

  it('copy writes the text with the source line to the clipboard and announces it', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    await renderUi(<HadithReaderScreen hadithNumber="2" slug={SLUG} />);
    await act(async () => {
      await press(screen.getByRole('button', { name: 'نسخ' }));
    });
    const written = jest.mocked(Clipboard.setStringAsync).mock.calls[0]?.[0] ?? '';
    expect(written.startsWith('FIXTURE text 2')).toBe(true);
    expect(written).toContain('المصدر: fawazahmed0/hadith-api');
    expect(announce).toHaveBeenCalledWith('تم النسخ');
  });

  it('share passes the same text to Share', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
    await renderUi(<HadithReaderScreen hadithNumber="2" slug={SLUG} />);
    await press(screen.getByRole('button', { name: 'مشاركة' }));
    expect(share).toHaveBeenCalledWith({ message: expect.stringContaining('FIXTURE text 2') });
    share.mockRestore();
  });

  it('copy and share keep the stored text byte for byte', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
    await renderUi(<HadithReaderScreen hadithNumber="5" slug={SLUG} />);
    await press(screen.getByRole('button', { name: 'مشاركة' }));
    const message = jest.mocked(share).mock.calls[0]?.[0]?.message ?? '';
    expect(message.startsWith('FIXTURE text 6 — not a hadith‏')).toBe(true);
    share.mockRestore();
  });

  it('next replaces the route with the next hadith, across a book boundary', async () => {
    await renderUi(<HadithReaderScreen hadithNumber="2" slug={SLUG} />);
    await press(screen.getByRole('button', { name: 'التالي' }));
    expect(router.replace).toHaveBeenCalledWith(`/hadith/${SLUG}/hadith/3`);
  });

  it('previous is disabled at the start of the collection', async () => {
    await renderUi(<HadithReaderScreen hadithNumber="1" slug={SLUG} />);
    expect(screen.getByRole('button', { name: 'السابق' })).toBeDisabled();
  });

  it('saves the reading place when the hadith opens', async () => {
    await renderUi(<HadithReaderScreen hadithNumber="2" slug={SLUG} />);
    expect(saveHadithReadingPlace).toHaveBeenCalledWith({ slug: SLUG, hadithNumber: '2', bookNumber: '1' });
  });

  it('shows not-found for an unknown hadith number', async () => {
    await renderUi(<HadithReaderScreen hadithNumber="999" slug={SLUG} />);
    expect(screen.getByText('المحتوى غير متوفر')).toBeOnTheScreen();
  });

  it('shows loading before the content database is ready', async () => {
    jest.mocked(useContentDb).mockReturnValue({ ready: false, error: null });
    await renderUi(<HadithReaderScreen hadithNumber="2" slug={SLUG} />);
    expect(screen.getByLabelText('جارٍ التحميل')).toBeOnTheScreen();
  });

  it('works with no network', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    await renderUi(<HadithReaderScreen hadithNumber="2" slug={SLUG} />);
    await press(screen.getByRole('button', { name: 'حفظ الحديث' }));
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('shows no grade text even when the pack holds a grade row', async () => {
    // hadith_grades(resource_id, id, entry_id, grade, graded_by): one placeholder grade for entry 2.
    executor.run('INSERT INTO hadith_grades (resource_id, id, entry_id, grade, graded_by) VALUES (?, ?, ?, ?, ?)', [
      FIXTURE_MULTI.resourceId,
      900,
      2,
      'FIXTURE grade',
      'FIXTURE grader',
    ]);
    await renderUi(<HadithReaderScreen hadithNumber="2" slug={SLUG} />);
    expect(screen.queryByText(/FIXTURE grade/)).toBeNull();
    expect(screen.queryByText(/FIXTURE grader/)).toBeNull();
  });

  it('shows the single number for a decimal hadith number', async () => {
    await renderUi(<HadithReaderScreen hadithNumber="3.1" slug={SLUG} />);
    expect(screen.getByText('حديث رقم ٣٫١')).toBeOnTheScreen();
  });

  it('keeps the single-book fixture reachable by its own slug', async () => {
    await renderUi(<HadithReaderScreen hadithNumber="1" slug={FIXTURE_SINGLE.slug} />);
    expect(screen.getByTestId('hadith-reader-content-card-text')).toHaveTextContent(/FIXTURE text 1/);
  });
});
