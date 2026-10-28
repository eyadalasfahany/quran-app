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
const EXACT = 'ٱلرَّحْمَـٰنِ‏ٱلرَّحِيمِ';
const REPLACEMENT = 'بِسْمِ‏ٱللَّهِ';
const NOW = 1_700_000_000_000;

const README_CONTRACT = [
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

type TafsirRow = { groupTafsirId: number; html: string };

function sha256(bytes: Uint8Array): Promise<string> {
  return Promise.resolve(createHash('sha256').update(bytes).digest('hex'));
}

function resource(overrides: Partial<ContentManifestResource> & Pick<ContentManifestResource, 'id'>): ContentManifestResource {
  return {
    group: 'tafsirs',
    name: 'Test',
    author_name: null,
    language_code: 'ar',
    direction: 'rtl',
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

function gzipPack(resourceId: number, rows: TafsirRow[]): Uint8Array {
  return gzipDatabase(resourceId, (database) => {
    database.exec(
      `CREATE TABLE tafsir_entries (
        resource_id INTEGER NOT NULL,
        group_tafsir_id INTEGER NOT NULL,
        first_verse_id INTEGER NOT NULL,
        last_verse_id INTEGER NOT NULL,
        html TEXT NOT NULL,
        PRIMARY KEY (resource_id, group_tafsir_id)
      )`,
    );
    const insert = database.prepare(
      'INSERT INTO tafsir_entries (resource_id, group_tafsir_id, first_verse_id, last_verse_id, html) VALUES (?, ?, 1, 7, ?)',
    );
    for (const row of rows) {
      insert.run(resourceId, row.groupTafsirId, row.html);
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

function installTafsir(
  executor: SqlExecutor,
  resourceId: number,
  version: number,
  rows: TafsirRow[],
  checkedAt = 1,
): void {
  executor.run(
    'INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at, change_cursor) VALUES (?, ?, ?, ?, ?, NULL)',
    [resourceId, 'tafsirs', version, 'old-hash', checkedAt],
  );
  for (const row of rows) {
    executor.run(
      'INSERT INTO tafsir_entries (resource_id, group_tafsir_id, first_verse_id, last_verse_id, html) VALUES (?, ?, 1, 7, ?)',
      [resourceId, row.groupTafsirId, row.html],
    );
  }
}

function tafsirHtml(executor: SqlExecutor, resourceId: number, groupTafsirId: number): string | undefined {
  return executor.get<{ html: string }>(
    'SELECT html FROM tafsir_entries WHERE resource_id = ? AND group_tafsir_id = ?',
    [resourceId, groupTafsirId],
  )?.html;
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

  it('imports a fresh tafsir pack and leaves other resources alone', async () => {
    const bytes = gzipPack(85, [{ groupTafsirId: 1, html: EXACT }]);
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
        'INSERT INTO tafsir_entries (resource_id, group_tafsir_id, first_verse_id, last_verse_id, html) VALUES (?, ?, 1, 7, ?)',
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
      expect(tafsirHtml(executor, 85, 1)).toBe(EXACT);
      expect(tafsirHtml(executor, 99, 1)).toBe('keep');
      expect(bytesOf(tafsirHtml(executor, 85, 1))).toEqual(bytesOf(EXACT));
      expect(
        executor.get<{ version: number; sha256: string; lastCheckedAt: number; group: string }>(
          'SELECT version, sha256, last_checked_at AS lastCheckedAt, "group" AS "group" FROM installed_resources WHERE resource_id = ?',
          [85],
        ),
      ).toEqual({ version: 3, sha256: hash, lastCheckedAt: NOW, group: 'tafsirs' });
      expect(executor.get<{ value: string }>('SELECT value FROM meta WHERE key = ?', ['manifest_etag'])?.value).toBe(
        published.etag,
      );
      expect(downloadPack).toHaveBeenCalledWith('http://localhost:8000/api/v1/content/packs/85/3', expect.any(String));
      expect(existsSync(join(cacheDir, 'packs', '85-3.sqlite.gz'))).toBe(false);
      expect(existsSync(join(cacheDir, 'packs', '85-3.sqlite'))).toBe(false);
    });
  });

  it('skips a resource in a retired group, keeps syncing the others, and removes its installed row', async () => {
    const bytes = gzipPack(85, [{ groupTafsirId: 1, html: EXACT }]);
    const hash = await sha256(bytes);
    const current = resource({
      id: 85,
      version: 1,
      pack: { url: '/api/v1/content/packs/85/1', size_bytes: bytes.byteLength, sha256: hash },
    });
    // An older server may still send a retired group that the current contract no longer lists.
    const retired = {
      ...resource({
        id: 88,
        version: 2,
        pack: { url: '/api/v1/content/packs/88/2', size_bytes: 1, sha256: 'retired-hash' },
      }),
      group: 'translations',
    } as unknown as ContentManifestResource;
    const published = manifest([retired, current]);
    const downloadPack = jest.fn(async (_url: string, toPath: string) => {
      mkdirSync(parentDir(toPath), { recursive: true });
      writeFileSync(toPath, bytes);
    });

    await withContentDb(async ({ executor, cacheDir }) => {
      executor.run(
        'INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at, change_cursor) VALUES (?, ?, ?, ?, ?, NULL)',
        [88, 'translations', 1, 'old-hash', 1],
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

      expect(report.resources).toEqual([
        { resourceId: 88, status: 'removed' },
        { resourceId: 85, status: 'pack-imported' },
      ]);
      expect(downloadPack).toHaveBeenCalledTimes(1);
      expect(downloadPack).toHaveBeenCalledWith('http://localhost:8000/api/v1/content/packs/85/1', expect.any(String));
      expect(tafsirHtml(executor, 85, 1)).toBe(EXACT);
      expect(executor.get('SELECT resource_id FROM installed_resources WHERE resource_id = ?', [88])).toBeUndefined();
      expect(executor.get<{ value: string }>('SELECT value FROM meta WHERE key = ?', ['manifest_etag'])?.value).toBe(
        published.etag,
      );
    });
  });

  it('on 304 only refreshes last_checked_at', async () => {
    const downloadPack = jest.fn();
    const selection = jest.fn(() => {
      throw new Error('selection');
    });

    await withContentDb(async ({ executor, cacheDir }) => {
      installTafsir(executor, 85, 2, [{ groupTafsirId: 1, html: 'kept' }], 10);
      installTafsir(executor, 86, 1, [{ groupTafsirId: 1, html: 'also' }], 10);
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
      expect(tafsirHtml(executor, 85, 1)).toBe('kept');
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
      installTafsir(executor, 85, 4, [{ groupTafsirId: 1, html: 'kept' }], 10);
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
    const bytes = gzipPack(85, [{ groupTafsirId: 1, html: 'new' }]);
    const entry = resource({
      id: 85,
      version: 2,
      pack: { url: '/api/v1/content/packs/85/2', size_bytes: bytes.byteLength, sha256: 'deadbeef' },
    });
    const published = manifest([entry]);

    await withContentDb(async ({ executor, cacheDir, transactions }) => {
      installTafsir(executor, 85, 1, [{ groupTafsirId: 1, html: 'old' }], 10);
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
      expect(tafsirHtml(executor, 85, 1)).toBe('old');
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
      installTafsir(executor, 85, 1, [{ groupTafsirId: 1, html: 'old' }], 10);
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
      expect(tafsirHtml(executor, 85, 1)).toBe('old');
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
                entity: 'tafsir_entry',
                entity_key: '1',
                op: 'upsert' as const,
                payload: { resource_id: 85, group_tafsir_id: 1, first_verse_id: 1, last_verse_id: 7, html: EXACT },
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
              entity: 'tafsir_entry',
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
      installTafsir(
        executor,
        85,
        3,
        [
          { groupTafsirId: 1, html: 'old' },
          { groupTafsirId: 2, html: 'gone' },
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
      expect(tafsirHtml(executor, 85, 1)).toBe(EXACT);
      expect(bytesOf(tafsirHtml(executor, 85, 1))).toEqual(bytesOf(EXACT));
      expect(tafsirHtml(executor, 85, 2)).toBeUndefined();
      expect(installedVersion(executor, 85)).toBe(5);
      expect(transactions()).toBe(1);
      expect(getChanges).toHaveBeenCalledTimes(2);
    });
  });

  it('keeps an upserted tafsir byte for byte', async () => {
    const entry = resource({ id: 85, version: 2, changes_since_min_version: 1 });
    const published = manifest([entry]);

    await withContentDb(async ({ executor, cacheDir }) => {
      installTafsir(executor, 85, 1, [{ groupTafsirId: 1, html: 'old' }]);
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
                  entity: 'tafsir_entry',
                  entity_key: '1',
                  op: 'upsert',
                  payload: { resource_id: 85, group_tafsir_id: 1, first_verse_id: 1, last_verse_id: 7, html: REPLACEMENT },
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

      expect(tafsirHtml(executor, 85, 1)).toBe(REPLACEMENT);
      expect(bytesOf(tafsirHtml(executor, 85, 1))).toEqual(bytesOf(REPLACEMENT));
    });
  });

  it('falls back to the pack when a later changes page is gone', async () => {
    const bytes = gzipPack(85, [{ groupTafsirId: 1, html: EXACT }]);
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
                entity: 'tafsir_entry',
                entity_key: '1',
                op: 'upsert' as const,
                payload: { resource_id: 85, group_tafsir_id: 1, first_verse_id: 1, last_verse_id: 7, html: 'partial' },
              },
            ],
            next_cursor: 'page-2',
          },
        };
      }
      return { status: 410 as const };
    });

    await withContentDb(async ({ executor, cacheDir, transactions }) => {
      installTafsir(executor, 85, 2, [{ groupTafsirId: 1, html: 'old' }]);
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
      expect(tafsirHtml(executor, 85, 1)).toBe(EXACT);
      expect(installedVersion(executor, 85)).toBe(4);
      expect(transactions()).toBe(1);
      expect(getChanges).toHaveBeenCalledTimes(2);
    });
  });

  it('deletes rows when a resource leaves the selection or the manifest', async () => {
    const kept = gzipPack(86, [{ groupTafsirId: 1, html: 'stay' }]);
    const hash = await sha256(kept);
    const entry = resource({
      id: 86,
      version: 1,
      pack: { url: '/api/v1/content/packs/86/1', size_bytes: kept.byteLength, sha256: hash },
    });
    const published = manifest([entry]);

    await withContentDb(async ({ executor, cacheDir }) => {
      installTafsir(executor, 85, 1, [{ groupTafsirId: 1, html: 'drop-me' }]);
      installTafsir(executor, 87, 1, [{ groupTafsirId: 1, html: 'unpublished' }]);
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
      expect(tafsirHtml(executor, 85, 1)).toBeUndefined();
      expect(tafsirHtml(executor, 87, 1)).toBeUndefined();
      expect(tafsirHtml(executor, 86, 1)).toBe('stay');
      expect(executor.get('SELECT resource_id FROM installed_resources WHERE resource_id = ?', [85])).toBeUndefined();
      expect(executor.get('SELECT resource_id FROM installed_resources WHERE resource_id = ?', [87])).toBeUndefined();
    });
  });

  it('continues after one resource fails', async () => {
    const bytes = gzipPack(86, [{ groupTafsirId: 1, html: 'ok' }]);
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
      expect(tafsirHtml(executor, 86, 1)).toBe('ok');
      expect(installedVersion(executor, 85)).toBeUndefined();
      expect(executor.get('SELECT value FROM meta WHERE key = ?', ['manifest_etag'])).toBeUndefined();
    });
  });

  it('downloads a pack when the installed version is below the change floor', async () => {
    const bytes = gzipPack(85, [{ groupTafsirId: 1, html: 'pack' }]);
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
      installTafsir(executor, 85, 2, [{ groupTafsirId: 1, html: 'old' }]);
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
      expect(tafsirHtml(executor, 85, 1)).toBe('pack');
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
