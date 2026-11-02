import { renderHook } from '@testing-library/react-native';

import { publishContentReady } from '@/core/db/content/content-ready';
import { openContentDb } from '@/core/db/content/open';
import type { SqlExecutor } from '@/core/db/sql-executor';

import { openReaderTestContent } from '../../../../jest/reader-test-db';
import { PREVIEW_VERSE_KEY, usePreviewVerseText } from './usePreviewVerseText';

jest.mock('@/core/db/content/open', () => ({ openContentDb: jest.fn() }));

const open = jest.mocked(openContentDb);
let executor: SqlExecutor;

beforeAll(async () => {
  executor = (await openReaderTestContent()).executor;
});

beforeEach(() => {
  open.mockReset();
  open.mockReturnValue({ executor } as unknown as ReturnType<typeof openContentDb>);
  publishContentReady({ ready: false, error: null });
});

afterAll(() => {
  publishContentReady({ ready: false, error: null });
});

describe('usePreviewVerseText', () => {
  it('gives null while content.db is not ready, and does not open it', async () => {
    const view = await renderHook(() => usePreviewVerseText());

    expect(view.result.current).toBeNull();
    expect(open).not.toHaveBeenCalled();
  });

  it('gives the stored text of the preview verse once content.db is ready, byte-for-byte', async () => {
    // The expected value is read from the same stored row, never typed in: the app does not author Quran text.
    const stored = executor.get<{ text: string }>('SELECT text_uthmani AS text FROM verses WHERE verse_key = ?', [
      PREVIEW_VERSE_KEY,
    ]);
    expect(stored?.text).toEqual(expect.any(String));
    expect(stored?.text.length).toBeGreaterThan(0);

    publishContentReady({ ready: true, error: null });
    const view = await renderHook(() => usePreviewVerseText());

    expect(view.result.current).toBe(stored?.text);
  });

  it('gives null when the database cannot be read', async () => {
    open.mockImplementation(() => {
      throw new Error('content database is not open');
    });
    publishContentReady({ ready: true, error: null });

    const view = await renderHook(() => usePreviewVerseText());

    expect(view.result.current).toBeNull();
  });
});
