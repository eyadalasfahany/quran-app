import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { i18n } from '@/core/i18n';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { openAudioTestDb } from '../data/test-db';
import { resetSkipNoticeForTests, useSkipNoticeStore } from '../skip-notice';

import { resetSkipAnnouncementForTests, useSkipNoticeMessage } from './useSkipNoticeMessage';

// Placeholder names only; the copy comes from the locale files.
const mockContent: { executor: SqlExecutor | null } = { executor: null };

jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => {
    if (mockContent.executor === null) {
      throw new Error('The test content database is not open.');
    }
    return { db: undefined, executor: mockContent.executor };
  },
  useContentDb: () => ({ ready: true, error: null }),
}));

const SURAH_38 = 'تخطّي سورة نموذج ثمانية وثلاثون · غير متوفرة بصوت قارئ نموذج';

let db: { executor: SqlExecutor; close: () => void };
let announce: jest.SpyInstance;

beforeEach(async () => {
  await i18n.changeLanguage('ar');
  announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
  db = openAudioTestDb();
  mockContent.executor = db.executor;
  db.executor.run(`INSERT INTO chapters (id, name_arabic, name_simple, name_en, revelation_place, revelation_order,
     verses_count, bismillah_pre, page_start, page_end) VALUES
     (37, 'سورة نموذج سبعة وثلاثون', 'Sample 37', 'Sample 37', 'makkah', 1, 1, 0, 1, 1),
     (38, 'سورة نموذج ثمانية وثلاثون', 'Sample 38', 'Sample 38', 'makkah', 1, 1, 0, 1, 1),
     (39, 'سورة نموذج تسعة وثلاثون', 'Sample 39', 'Sample 39', 'makkah', 1, 1, 0, 1, 1)`);
  db.executor.run(`INSERT INTO catalog_resources (resource_id, "group", name, name_ar, version, pack_size_bytes) VALUES
     (30, 'chapter_recitations', 'Sample Reciter', 'قارئ نموذج', 1, 1000)`);
  db.executor.run(`INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at, name, name_ar) VALUES
     (30, 'chapter_recitations', 1, 'a', 0, 'Sample Reciter', 'قارئ نموذج')`);
  resetSkipNoticeForTests();
  resetSkipAnnouncementForTests();
});

afterEach(() => {
  resetSkipNoticeForTests();
  resetSkipAnnouncementForTests();
  announce.mockRestore();
  db.close();
  mockContent.executor = null;
});

/** Shows a notice inside act, so the hook re-renders with it. */
async function showNotice(reciterId: number, chapterIds: number[]) {
  await act(async () => {
    useSkipNoticeStore.getState().show({ reciterId, chapterIds });
  });
}

describe('useSkipNoticeMessage', () => {
  it('is null when there is no notice', async () => {
    const { result } = await renderHook(() => useSkipNoticeMessage());

    expect(result.current).toBeNull();
    expect(announce).not.toHaveBeenCalled();
  });

  it('names one skipped surah and the reciter', async () => {
    const { result } = await renderHook(() => useSkipNoticeMessage());

    await showNotice(30, [38]);

    expect(result.current).toBe(SURAH_38);
  });

  it('gives the count for two or more skipped surahs', async () => {
    const { result } = await renderHook(() => useSkipNoticeMessage());

    await showNotice(30, [38, 39]);

    expect(result.current).toBe('تخطّي ٢ سور · غير متوفرة بصوت قارئ نموذج');
  });

  it('falls back to the unnamed reciter label when the reciter is not installed', async () => {
    const { result } = await renderHook(() => useSkipNoticeMessage());

    await showNotice(99, [38]);

    expect(result.current).toBe('تخطّي سورة نموذج ثمانية وثلاثون · غير متوفرة بصوت قارئ');
  });

  it('announces a notice once, and not again on a re-render', async () => {
    const { result, rerender } = await renderHook(() => useSkipNoticeMessage());

    await showNotice(30, [38]);
    await rerender({});
    await rerender({});

    expect(result.current).toBe(SURAH_38);
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith(SURAH_38);
  });

  it('announces each new notice, even when the text is the same', async () => {
    await renderHook(() => useSkipNoticeMessage());

    await showNotice(30, [38]);
    await showNotice(30, [38]);

    expect(announce).toHaveBeenCalledTimes(2);
  });

  it('does not announce twice from a second mounted bar for the same notice', async () => {
    await renderHook(() => useSkipNoticeMessage());
    await renderHook(() => useSkipNoticeMessage());

    await showNotice(30, [38]);

    expect(announce).toHaveBeenCalledTimes(1);
  });
});
