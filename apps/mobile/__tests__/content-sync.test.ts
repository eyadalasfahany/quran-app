import type { ContentManifest, ContentManifestResource } from '@quran/api-contract';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { gzipSync, gunzipSync } from 'fflate';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { syncContent, type ContentApi, type ContentSyncDeps, type FileStore } from '@/core/sync/content-sync';
import { contentContract } from '@/core/sync/content-tables';

import { applyContentMigrations } from '../jest/apply-content-migrations';
import { openNodeSqlite } from '../jest/node-sqlite-executor';

const migrationsDir = join(process.cwd(), 'src/core/db/content/migrations');
const EXACT = 'ٱلرَّحْمَـٰنِ\u200Fٱلرَّحِيمِ';
const REPLACEMENT = 'بِسْمِ\u200Fٱللَّهِ';
const NOW = 1_700_000_000_000;

const README_CONTRACT = [
  {
    group: 'translations',
    tables: [{ name: 'translation_entries', columns: ['resource_id', 'verse_id', 'text', 'footnotes'] }],
    entities: [{ entity: 'translation_entry', key: 'verse_id' }],
  },
  {
    group: 'tafsirs',
    tables: [
      {
        name: 'tafsir_entries',
        columns: ['resource_id', 'group_tafsir_id', 'first_verse_id', 'last_verse_id', 'html'],
      },
    ],
    entities: [{ entity: 'tafsir_entry', key: 'group_tafsir_id' }],
  },
  {
    group: 'mushafs',
    tables: [
      {
        name: 'mushafs',
        columns: ['id', 'resource_id', 'name', 'pages_count', 'lines_per_page', 'default_font_name'],
      },
      {
        name: 'mushaf_pages',
        columns: [
          'mushaf_id',
          'page_number',
          'first_verse_id',
          'last_verse_id',
          'first_word_id',
          'last_word_id',
          'verse_mapping',
        ],
      },
      {
        name: 'word_layouts',
        columns: [
          'mushaf_id',
          'word_id',
          'verse_id',
          'position_in_verse',
          'char_type',
          'glyph',
          'page',
          'line',
          'position_in_line',
        ],
      },
    ],
    entities: [
      { entity: 'mushaf', key: 'id' },
      { entity: 'mushaf_page', key: 'page_number' },
      { entity: 'word_layout', key: 'word_id' },
    ],
  },
  {
    group: 'chapter_recitations',
    tables: [
      {
        name: 'recitations',
        columns: ['id', 'resource_id', 'reciter_name', 'reciter_name_ar', 'style', 'qirat', 'has_word_segments'],
      },
      {
        name: 'chapter_audio_files',
        columns: ['id', 'recitation_id', 'chapter_id', 'audio_url', 'size_bytes', 'duration_ms', 'format'],
      },
      {
        name: 'recitation_timings',
        columns: ['audio_file_id', 'verse_id', 'start_ms', 'end_ms', 'segments'],
      },
    ],
    entities: [
      { entity: 'recitation', key: 'id' },
      { entity: 'chapter_audio_file', key: 'id' },
      { entity: 'recitation_timing', key: '{audio_file_id}:{verse_id}' },
    ],
  },
];

function sha256(bytes: Uint8Array): Promise<string> {
  return Promise.resolve(createHash('sha256').update(bytes).digest('hex'));
}

function resource(overrides: Partial<ContentManifestResource> & Pick<ContentManifestResource, 'id'>): ContentManifestResource {
  return {
    group: 'translations',
    name: 'Test',
    author_name: null,
    language_code: 'en',
    direction: 'ltr',
    version: 1,
    pack: { url: `/api/v1/content/packs/${overrides.id}/1`, size_bytes: 1, sha256: 'abc' },
    changes_since_min_version: 1,
    ...overrides,
  };
}

function manifest(resources: ContentManifestResource[], etag = '"manifest"'): { etag: string; body: ContentManifest } {
  return {
    etag,
    body: {
      generated_at: '2026-10-27T00:00:00.000Z',
      pack_schema_version: 1,
      resources,
    },
  };
}

function gzipPack(resourceId: number, rows: { verseId: number; text: string }[]): Uint8Array {
  return gzipDatabase(resourceId, (database) => {
    database.exec(
      `CREATE TABLE translation_entries (
        resource_id INTEGER NOT NULL,
        verse_id INTEGER NOT NULL,
        text TEXT NOT NULL,
        footnotes TEXT,
        PRIMARY KEY (resource_id, verse_id)
      )`,
    );
    const insert = database.prepare(
      'INSERT INTO translation_entries (resource_id, verse_id, text, footnotes) VALUES (?, ?, ?, NULL)',
    );
    for (const row of rows) {
      insert.run(resourceId, row.verseId, row.text);
    }
  });
}

function gzipDatabase(resourceId: number, fill: (database: DatabaseSync) => void): Uint8Array {
  const directory = mkdtempSync(join(tmpdir(), 'content-pack-'));
  const path = join(directory, 'pack.sqlite');
  try {
    const database = new DatabaseSync(path);
    database.exec('PRAGMA journal_mode = DELETE');
    database.exec('CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    database.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('pack_schema_version', '1');
    database.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('resource_id', String(resourceId));
    fill(database);
    database.close();
    return gzipSync(new Uint8Array(readFileSync(path)));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function fileStore(cacheDir: string): FileStore {
  return {
    cacheDir,
    async readBytes(path) {
      return new Uint8Array(readFileSync(path));
    },
    async writeBytes(path, bytes) {
      mkdirSync(parentDir(path), { recursive: true });
      writeFileSync(path, bytes);
    },
    async remove(path) {
      if (existsSync(path)) {
        rmSync(path, { force: true });
      }
    },
  };
}

function parentDir(path: string): string {
  const index = path.lastIndexOf('/');
  return index === -1 ? '.' : path.slice(0, index);
}

function installTranslation(
  executor: SqlExecutor,
  resourceId: number,
  version: number,
  rows: { verseId: number; text: string }[],
  checkedAt = 1,
): void {
  executor.run(
    'INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at, change_cursor) VALUES (?, ?, ?, ?, ?, NULL)',
    [resourceId, 'translations', version, 'old-hash', checkedAt],
  );
  for (const row of rows) {
    executor.run('INSERT INTO translation_entries (resource_id, verse_id, text, footnotes) VALUES (?, ?, ?, NULL)', [
      resourceId,
      row.verseId,
      row.text,
    ]);
  }
}

function translationText(executor: SqlExecutor, resourceId: number, verseId: number): string | undefined {
  return executor.get<{ text: string }>('SELECT text FROM translation_entries WHERE resource_id = ? AND verse_id = ?', [
    resourceId,
    verseId,
  ])?.text;
}

async function withContentDb(
  run: (context: { executor: SqlExecutor; database: DatabaseSync; cacheDir: string; transactions: () => number }) => Promise<void>,
): Promise<void> {
  const cacheDir = mkdtempSync(join(tmpdir(), 'content-cache-'));
  const opened = openNodeSqlite(':memory:');
  let transactions = 0;
  const executor: SqlExecutor = {
    ...opened.executor,
    transaction(fn) {
      transactions += 1;
      return opened.executor.transaction(fn);
    },
  };
  applyContentMigrations(executor, migrationsDir);
  try {
    await run({ executor, database: opened.database, cacheDir, transactions: () => transactions });
  } finally {
    opened.database.close();
    rmSync(cacheDir, { recursive: true, force: true });
  }
}

describe('content sync', () => {
  const originalUrl = process.env.EXPO_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8000';
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL;
    } else {
      process.env.EXPO_PUBLIC_API_URL = originalUrl;
    }
    jest.restoreAllMocks();
  });

  it('lists exactly the shared pack contract', () => {
    expect(contentContract()).toEqual(README_CONTRACT);
  });

  it('imports a fresh translation pack and leaves other resources alone', async () => {
    const bytes = gzipPack(85, [{ verseId: 1, text: EXACT }]);
    const hash = await sha256(bytes);
    const entry = resource({
      id: 85,
      version: 3,
      pack: { url: '/api/v1/content/packs/85/3', size_bytes: bytes.byteLength, sha256: hash },
    });
    const published = manifest([entry]);
    const downloadPack = jest.fn(async (_url: string, toPath: string) => {
      mkdirSync(parentDir(toPath), { recursive: true });
      writeFileSync(toPath, bytes);
    });

    await withContentDb(async ({ executor, cacheDir }) => {
      executor.run(
        'INSERT INTO translation_entries (resource_id, verse_id, text, footnotes) VALUES (?, ?, ?, NULL)',
        [99, 1, 'keep'],
      );
      const report = await syncContent(
        await deps(executor, cacheDir, {
          getManifest: async () => ({ status: 200, etag: published.etag, manifest: published.body }),
          getChanges: async () => {
            throw new Error('changes');
          },
          downloadPack,
        }),
      );

      expect(report.resources).toEqual([{ resourceId: 85, status: 'pack-imported' }]);
      expect(translationText(executor, 85, 1)).toBe(EXACT);
      expect(translationText(executor, 99, 1)).toBe('keep');
      expect(bytesOf(translationText(executor, 85, 1))).toEqual(bytesOf(EXACT));
      expect(
        executor.get<{ version: number; sha256: string; lastCheckedAt: number; group: string }>(
          'SELECT version, sha256, last_checked_at AS lastCheckedAt, "group" AS "group" FROM installed_resources WHERE resource_id = ?',
          [85],
        ),
      ).toEqual({ version: 3, sha256: hash, lastCheckedAt: NOW, group: 'translations' });
      expect(executor.get<{ value: string }>('SELECT value FROM meta WHERE key = ?', ['manifest_etag'])?.value).toBe(
        published.etag,
      );
      expect(downloadPack).toHaveBeenCalledWith('http://localhost:8000/api/v1/content/packs/85/3', expect.any(String));
      expect(existsSync(join(cacheDir, 'packs', '85-3.sqlite.gz'))).toBe(false);
      expect(existsSync(join(cacheDir, 'packs', '85-3.sqlite'))).toBe(false);
    });
  });

  it('on 304 only refreshes last_checked_at', async () => {
    const downloadPack = jest.fn();
    const selection = jest.fn(() => {
      throw new Error('selection');
    });

    await withContentDb(async ({ executor, cacheDir }) => {
      installTranslation(executor, 85, 2, [{ verseId: 1, text: 'kept' }], 10);
      installTranslation(executor, 86, 1, [{ verseId: 1, text: 'also' }], 10);
      executor.run('INSERT INTO meta (key, value) VALUES (?, ?)', ['manifest_etag', '"same"']);

      const report = await syncContent({
        ...(await deps(executor, cacheDir, {
          getManifest: async (etag) => {
            expect(etag).toBe('"same"');
            return { status: 304 };
          },
          getChanges: async () => {
            throw new Error('changes');
          },
          downloadPack,
        })),
        selection,
      });

      expect(report.resources).toEqual([
        { resourceId: 85, status: 'unchanged' },
        { resourceId: 86, status: 'unchanged' },
      ]);
      expect(checkedAt(executor, 85)).toBe(NOW);
      expect(checkedAt(executor, 86)).toBe(NOW);
      expect(translationText(executor, 85, 1)).toBe('kept');
      expect(downloadPack).not.toHaveBeenCalled();
      expect(selection).not.toHaveBeenCalled();
    });
  });

  it('does not download a resource that is already at the manifest version', async () => {
    const downloadPack = jest.fn();
    const getChanges = jest.fn();
    const entry = resource({ id: 85, version: 4, changes_since_min_version: 1 });
    const published = manifest([entry]);

    await withContentDb(async ({ executor, cacheDir }) => {
      installTranslation(executor, 85, 4, [{ verseId: 1, text: 'kept' }], 10);
      const report = await syncContent(
        await deps(executor, cacheDir, {
          getManifest: async () => ({ status: 200, etag: published.etag, manifest: published.body }),
          getChanges,
          downloadPack,
        }),
      );

      expect(report.resources).toEqual([{ resourceId: 85, status: 'unchanged' }]);
      expect(checkedAt(executor, 85)).toBe(NOW);
      expect(downloadPack).not.toHaveBeenCalled();
      expect(getChanges).not.toHaveBeenCalled();
    });
  });

  it('skips a pack whose SHA-256 does not match and deletes the temp file', async () => {
    const bytes = gzipPack(85, [{ verseId: 1, text: 'new' }]);
    const entry = resource({
      id: 85,
      version: 2,
      pack: { url: '/api/v1/content/packs/85/2', size_bytes: bytes.byteLength, sha256: 'deadbeef' },
    });
    const published = manifest([entry]);

    await withContentDb(async ({ executor, cacheDir, transactions }) => {
      installTranslation(executor, 85, 1, [{ verseId: 1, text: 'old' }], 10);
      const report = await syncContent(
        await deps(executor, cacheDir, {
          getManifest: async () => ({ status: 200, etag: published.etag, manifest: published.body }),
          getChanges: async () => ({ status: 410 }),
          downloadPack: async (_url, toPath) => {
            mkdirSync(parentDir(toPath), { recursive: true });
            writeFileSync(toPath, bytes);
          },
        }),
      );

      expect(report.resources).toEqual([
        { resourceId: 85, status: 'skipped', reason: 'Pack SHA-256 does not match the manifest.' },
      ]);
      expect(translationText(executor, 85, 1)).toBe('old');
      expect(installedVersion(executor, 85)).toBe(1);
      expect(existsSync(join(cacheDir, 'packs', '85-2.sqlite.gz'))).toBe(false);
      expect(existsSync(join(cacheDir, 'packs', '85-2.sqlite'))).toBe(false);
      expect(transactions()).toBe(0);
      expect(executor.get('SELECT value FROM meta WHERE key = ?', ['manifest_etag'])).toBeUndefined();
    });
  });

  it('rolls back a pack import when a table is missing', async () => {
    const bytes = gzipDatabase(85, () => undefined);
    const hash = await sha256(bytes);
    const entry = resource({
      id: 85,
      version: 2,
      changes_since_min_version: 2,
      pack: { url: '/api/v1/content/packs/85/2', size_bytes: bytes.byteLength, sha256: hash },
    });
    const published = manifest([entry]);

    await withContentDb(async ({ executor, cacheDir, transactions }) => {
      installTranslation(executor, 85, 1, [{ verseId: 1, text: 'old' }], 10);
      const report = await syncContent(
        await deps(executor, cacheDir, {
          getManifest: async () => ({ status: 200, etag: published.etag, manifest: published.body }),
          getChanges: async () => {
            throw new Error('changes');
          },
          downloadPack: async (_url, toPath) => {
            mkdirSync(parentDir(toPath), { recursive: true });
            writeFileSync(toPath, bytes);
          },
        }),
      );

      expect(report.resources[0]?.status).toBe('failed');
      expect(translationText(executor, 85, 1)).toBe('old');
      expect(installedVersion(executor, 85)).toBe(1);
      expect(transactions()).toBe(1);
      expect(executor.get('SELECT value FROM meta WHERE key = ?', ['manifest_etag'])).toBeUndefined();
    });
  });

  it('applies upsert and delete across two pages in one transaction', async () => {
    const entry = resource({ id: 85, version: 5, changes_since_min_version: 1 });
    const published = manifest([entry]);
    const getChanges = jest.fn(async (query: { cursor?: string | null }) => {
      if (query.cursor === undefined) {
        return {
          status: 200 as const,
          page: {
            data: [
              {
                id: 1,
                version: 4,
                entity: 'translation_entry',
                entity_key: '1',
                op: 'upsert' as const,
                payload: { resource_id: 85, verse_id: 1, text: EXACT, footnotes: null },
              },
            ],
            next_cursor: 'page-2',
          },
        };
      }
      return {
        status: 200 as const,
        page: {
          data: [
            {
              id: 2,
              version: 5,
              entity: 'translation_entry',
              entity_key: '2',
              op: 'delete' as const,
              payload: null,
            },
          ],
          next_cursor: null,
        },
      };
    });

    await withContentDb(async ({ executor, cacheDir, transactions }) => {
      installTranslation(
        executor,
        85,
        3,
        [
          { verseId: 1, text: 'old' },
          { verseId: 2, text: 'gone' },
        ],
        10,
      );
      const report = await syncContent(
        await deps(executor, cacheDir, {
          getManifest: async () => ({ status: 200, etag: published.etag, manifest: published.body }),
          getChanges,
          downloadPack: async () => {
            throw new Error('download');
          },
        }),
      );

      expect(report.resources).toEqual([{ resourceId: 85, status: 'changes-applied' }]);
      expect(translationText(executor, 85, 1)).toBe(EXACT);
      expect(bytesOf(translationText(executor, 85, 1))).toEqual(bytesOf(EXACT));
      expect(translationText(executor, 85, 2)).toBeUndefined();
      expect(installedVersion(executor, 85)).toBe(5);
      expect(transactions()).toBe(1);
      expect(getChanges).toHaveBeenCalledTimes(2);
    });
  });

  it('keeps an upserted translation byte for byte', async () => {
    const entry = resource({ id: 85, version: 2, changes_since_min_version: 1 });
    const published = manifest([entry]);

    await withContentDb(async ({ executor, cacheDir }) => {
      installTranslation(executor, 85, 1, [{ verseId: 1, text: 'old' }]);
      await syncContent(
        await deps(executor, cacheDir, {
          getManifest: async () => ({ status: 200, etag: published.etag, manifest: published.body }),
          getChanges: async () => ({
            status: 200,
            page: {
              data: [
                {
                  id: 1,
                  version: 2,
                  entity: 'translation_entry',
                  entity_key: '1',
                  op: 'upsert',
                  payload: { resource_id: 85, verse_id: 1, text: REPLACEMENT, footnotes: null },
                },
              ],
              next_cursor: null,
            },
          }),
          downloadPack: async () => {
            throw new Error('download');
          },
        }),
      );

      expect(translationText(executor, 85, 1)).toBe(REPLACEMENT);
      expect(bytesOf(translationText(executor, 85, 1))).toEqual(bytesOf(REPLACEMENT));
    });
  });

  it('falls back to the pack when a later changes page is gone', async () => {
    const bytes = gzipPack(85, [{ verseId: 1, text: EXACT }]);
    const hash = await sha256(bytes);
    const entry = resource({
      id: 85,
      version: 4,
      changes_since_min_version: 1,
      pack: { url: '/api/v1/content/packs/85/4', size_bytes: bytes.byteLength, sha256: hash },
    });
    const published = manifest([entry]);
    const getChanges = jest.fn(async (query: { cursor?: string | null }) => {
      if (query.cursor === undefined) {
        return {
          status: 200 as const,
          page: {
            data: [
              {
                id: 1,
                version: 3,
                entity: 'translation_entry',
                entity_key: '1',
                op: 'upsert' as const,
                payload: { resource_id: 85, verse_id: 1, text: 'partial', footnotes: null },
              },
            ],
            next_cursor: 'page-2',
          },
        };
      }
      return { status: 410 as const };
    });

    await withContentDb(async ({ executor, cacheDir, transactions }) => {
      installTranslation(executor, 85, 2, [{ verseId: 1, text: 'old' }]);
      const report = await syncContent(
        await deps(executor, cacheDir, {
          getManifest: async () => ({ status: 200, etag: published.etag, manifest: published.body }),
          getChanges,
          downloadPack: async (_url, toPath) => {
            mkdirSync(parentDir(toPath), { recursive: true });
            writeFileSync(toPath, bytes);
          },
        }),
      );

      expect(report.resources).toEqual([{ resourceId: 85, status: 'pack-imported' }]);
      expect(translationText(executor, 85, 1)).toBe(EXACT);
      expect(installedVersion(executor, 85)).toBe(4);
      expect(transactions()).toBe(1);
      expect(getChanges).toHaveBeenCalledTimes(2);
    });
  });

  it('deletes rows when a resource leaves the selection or the manifest', async () => {
    const kept = gzipPack(86, [{ verseId: 1, text: 'stay' }]);
    const hash = await sha256(kept);
    const entry = resource({
      id: 86,
      version: 1,
      pack: { url: '/api/v1/content/packs/86/1', size_bytes: kept.byteLength, sha256: hash },
    });
    const published = manifest([entry]);

    await withContentDb(async ({ executor, cacheDir }) => {
      installTranslation(executor, 85, 1, [{ verseId: 1, text: 'drop-me' }]);
      installTranslation(executor, 87, 1, [{ verseId: 1, text: 'unpublished' }]);
      const report = await syncContent({
        ...(await deps(executor, cacheDir, {
          getManifest: async () => ({ status: 200, etag: published.etag, manifest: published.body }),
          getChanges: async () => {
            throw new Error('changes');
          },
          downloadPack: async (_url, toPath) => {
            mkdirSync(parentDir(toPath), { recursive: true });
            writeFileSync(toPath, kept);
          },
        })),
        selection: () => [86],
      });

      expect(report.resources).toEqual([
        { resourceId: 85, status: 'removed' },
        { resourceId: 87, status: 'removed' },
        { resourceId: 86, status: 'pack-imported' },
      ]);
      expect(translationText(executor, 85, 1)).toBeUndefined();
      expect(translationText(executor, 87, 1)).toBeUndefined();
      expect(translationText(executor, 86, 1)).toBe('stay');
      expect(executor.get('SELECT resource_id FROM installed_resources WHERE resource_id = ?', [85])).toBeUndefined();
      expect(executor.get('SELECT resource_id FROM installed_resources WHERE resource_id = ?', [87])).toBeUndefined();
    });
  });

  it('continues after one resource fails', async () => {
    const bytes = gzipPack(86, [{ verseId: 1, text: 'ok' }]);
    const hash = await sha256(bytes);
    const first = resource({ id: 85, version: 1, pack: { url: '/api/v1/content/packs/85/1', size_bytes: 1, sha256: hash } });
    const second = resource({
      id: 86,
      version: 1,
      pack: { url: '/api/v1/content/packs/86/1', size_bytes: bytes.byteLength, sha256: hash },
    });
    const published = manifest([first, second]);

    await withContentDb(async ({ executor, cacheDir }) => {
      const report = await syncContent({
        ...(await deps(executor, cacheDir, {
          getManifest: async () => ({ status: 200, etag: published.etag, manifest: published.body }),
          getChanges: async () => {
            throw new Error('changes');
          },
          downloadPack: async (url, toPath) => {
            if (url.endsWith('/85/1')) {
              throw new Error('network down');
            }
            mkdirSync(parentDir(toPath), { recursive: true });
            writeFileSync(toPath, bytes);
          },
        })),
        selection: () => [85, 86],
      });

      expect(report.resources).toEqual([
        { resourceId: 85, status: 'failed', reason: 'network down' },
        { resourceId: 86, status: 'pack-imported' },
      ]);
      expect(translationText(executor, 86, 1)).toBe('ok');
      expect(installedVersion(executor, 85)).toBeUndefined();
      expect(executor.get('SELECT value FROM meta WHERE key = ?', ['manifest_etag'])).toBeUndefined();
    });
  });

  it('downloads a pack when the installed version is below the change floor', async () => {
    const bytes = gzipPack(85, [{ verseId: 1, text: 'pack' }]);
    const hash = await sha256(bytes);
    const entry = resource({
      id: 85,
      version: 8,
      changes_since_min_version: 6,
      pack: { url: '/api/v1/content/packs/85/8', size_bytes: bytes.byteLength, sha256: hash },
    });
    const published = manifest([entry]);
    const getChanges = jest.fn();

    await withContentDb(async ({ executor, cacheDir }) => {
      installTranslation(executor, 85, 2, [{ verseId: 1, text: 'old' }]);
      const report = await syncContent(
        await deps(executor, cacheDir, {
          getManifest: async () => ({ status: 200, etag: published.etag, manifest: published.body }),
          getChanges,
          downloadPack: async (_url, toPath) => {
            mkdirSync(parentDir(toPath), { recursive: true });
            writeFileSync(toPath, bytes);
          },
        }),
      );

      expect(getChanges).not.toHaveBeenCalled();
      expect(report.resources).toEqual([{ resourceId: 85, status: 'pack-imported' }]);
      expect(translationText(executor, 85, 1)).toBe('pack');
    });
  });
});

function bytesOf(value: string | undefined): number[] {
  return [...new TextEncoder().encode(value ?? '')];
}

function checkedAt(executor: SqlExecutor, resourceId: number): number | undefined {
  return executor.get<{ lastCheckedAt: number }>(
    'SELECT last_checked_at AS lastCheckedAt FROM installed_resources WHERE resource_id = ?',
    [resourceId],
  )?.lastCheckedAt;
}

function installedVersion(executor: SqlExecutor, resourceId: number): number | undefined {
  return executor.get<{ version: number }>('SELECT version FROM installed_resources WHERE resource_id = ?', [resourceId])
    ?.version;
}

async function deps(executor: SqlExecutor, cacheDir: string, api: ContentApi): Promise<ContentSyncDeps> {
  return {
    db: executor,
    api,
    files: fileStore(cacheDir),
    sha256,
    gunzip: (bytes) => gunzipSync(bytes),
    now: () => NOW,
    selection: () => [85],
  };
}
