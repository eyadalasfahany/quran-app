import type { ContentManifest, ContentManifestResource } from '@quran/api-contract';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { gzipSync, gunzipSync } from 'fflate';

import type { SqlExecutor } from '@/core/db/sql-executor';
import {
  catalogNeedsManifest,
  syncContent,
  type ContentApi,
  type ContentSyncDeps,
  type FileStore,
} from '@/core/sync/content-sync';
import { useCatalogVersion } from '@/core/sync/catalog-version';
import { contentContract } from '@/core/sync/content-tables';
import { selectedResourceIds } from '@/core/sync/selection';
import { storage, storageKeys } from '@/core/storage/mmkv';

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
  {
    group: 'azkar',
    tables: [
      {
        name: 'azkar_chapters',
        columns: ['resource_id', 'id', 'source_chapter_id', 'number', 'title_ar', 'title_en'],
      },
      {
        name: 'azkar_entries',
        columns: [
          'resource_id',
          'id',
          'entry_key',
          'chapter_id',
          'position',
          'source_reference',
          'entry_type',
          'occasion',
          'timing_type',
          'timing_prayer',
          'timing_policy_id',
          'review_status',
          'source_version',
          'imported_at',
        ],
      },
      {
        name: 'azkar_items',
        columns: [
          'resource_id',
          'id',
          'entry_id',
          'item_key',
          'variation_key',
          'position',
          'kind',
          'required_count',
          'speaker',
          'source_dua_id',
          'text_en',
          'transliteration',
          'source_text_sha256',
          'repeat_group',
          'repeat_times',
        ],
      },
      {
        name: 'azkar_segments',
        columns: [
          'resource_id',
          'item_id',
          'position',
          'kind',
          'text_ar',
          'quran_surah',
          'quran_verse_from',
          'quran_verse_to',
          'text_search',
        ],
      },
      {
        name: 'azkar_categories',
        columns: ['resource_id', 'id', 'kind', 'position', 'occasion', 'progress_period'],
      },
      {
        name: 'azkar_entry_categories',
        columns: ['resource_id', 'category_id', 'entry_id', 'variation_key', 'position'],
      },
      {
        name: 'azkar_notes',
        columns: [
          'resource_id',
          'id',
          'entry_id',
          'item_id',
          'kind',
          'text_ar',
          'text_en',
          'grader',
          'source_type',
          'source_name',
          'source_reference',
          'source_url',
          'review_status',
        ],
      },
      {
        name: 'azkar_recordings',
        columns: [
          'resource_id',
          'id',
          'recording_key',
          'item_id',
          'reciter_name',
          'reciter_name_ar',
          'source',
          'remote_url',
          'duration_ms',
          'size_bytes',
          'stream_allowed',
          'download_allowed',
          'redistribution_allowed',
          'attribution_ar',
          'attribution_en',
          'licence',
          'licence_url',
          'rights_verified_at',
        ],
      },
    ],
    entities: [
      { entity: 'azkar_chapter', key: 'id' },
      { entity: 'azkar_entry', key: 'id' },
      { entity: 'azkar_item', key: 'id' },
      { entity: 'azkar_segment', key: '{item_id}:{position}' },
      { entity: 'azkar_category', key: 'id' },
      { entity: 'azkar_entry_category', key: '{category_id}:{entry_id}:{variation_key}' },
      { entity: 'azkar_note', key: 'id' },
      { entity: 'azkar_recording', key: 'id' },
    ],
  },
  {
    group: 'duas',
    tables: [
      {
        name: 'dua_items',
        columns: ['resource_id', 'id', 'dua_key', 'kind', 'group_id', 'position'],
      },
      {
        name: 'dua_quran_spans',
        columns: ['resource_id', 'item_id', 'surah', 'verse_from', 'verse_to'],
      },
      {
        name: 'dua_hadith',
        columns: [
          'resource_id',
          'item_id',
          'hadeeth_id',
          'title',
          'hadeeth',
          'attribution',
          'grade',
          'explanation',
          'reference',
          'hints',
          'text_search',
          'source_url',
        ],
      },
      {
        name: 'dua_groups',
        columns: ['resource_id', 'id', 'source_category_id', 'title', 'position'],
      },
      {
        name: 'dua_links',
        columns: ['resource_id', 'id', 'item_id', 'hadeeth_id', 'entry_key'],
      },
      {
        name: 'dua_collection_refs',
        columns: ['resource_id', 'id', 'item_id', 'collection_slug', 'hadith_number'],
      },
      {
        name: 'dua_collection_books',
        columns: ['resource_id', 'id', 'collection_slug', 'book_number', 'position'],
      },
    ],
    entities: [
      { entity: 'dua_item', key: 'id' },
      { entity: 'dua_quran_span', key: 'item_id' },
      { entity: 'dua_hadith', key: 'item_id' },
      { entity: 'dua_group', key: 'id' },
      { entity: 'dua_link', key: 'id' },
      { entity: 'dua_collection_ref', key: 'id' },
      { entity: 'dua_collection_book', key: 'id' },
    ],
  },
  {
    group: 'names',
    tables: [
      {
        name: 'names_lists',
        columns: [
          'resource_id',
          'list_slug',
          'title_ar',
          'source_label_ar',
          'attribution_ar',
          'attribution_en',
          'edition_reference',
          'source_version',
        ],
      },
      {
        name: 'names',
        columns: ['resource_id', 'id', 'name_slug', 'position', 'name_ar', 'text_search'],
      },
      {
        name: 'names_verses',
        columns: ['resource_id', 'name_slug', 'verse_key', 'review_status', 'evidence'],
      },
      {
        name: 'names_notes',
        columns: [
          'resource_id',
          'id',
          'name_slug',
          'kind',
          'text_ar',
          'source_type',
          'source_name',
          'source_reference',
          'source_url',
          'review_status',
        ],
      },
    ],
    entities: [
      { entity: 'names_list', key: 'list_slug' },
      { entity: 'name', key: 'name_slug' },
      { entity: 'names_verse', key: '{name_slug}:{verse_key}' },
      { entity: 'names_note', key: 'id' },
    ],
  },
  {
    group: 'hadith_collections',
    tables: [
      {
        name: 'hadith_collections',
        columns: [
          'resource_id',
          'id',
          'slug',
          'source_code',
          'title_ar',
          'title_en',
          'author_ar',
          'author_en',
          'attribution_ar',
          'attribution_en',
          'source_url',
          'total_hadith',
          'books_count',
        ],
      },
      { name: 'hadith_books', columns: ['resource_id', 'id', 'book_number', 'title_ar', 'title_en', 'position', 'hadith_count'] },
      {
        name: 'hadith_chapters',
        columns: ['resource_id', 'id', 'book_id', 'chapter_number', 'source_chapter_key', 'title_ar', 'title_en', 'position', 'hadith_count'],
      },
      {
        name: 'hadith_entries',
        columns: [
          'resource_id',
          'id',
          'book_id',
          'chapter_id',
          'hadith_number',
          'arabic_number',
          'position',
          'text_ar',
          'text_en',
          'narrator_en',
          'text_search',
          'source_url',
          'number_first',
          'number_last',
          'source_code',
        ],
      },
      { name: 'hadith_grades', columns: ['resource_id', 'id', 'entry_id', 'grade', 'graded_by'] },
      { name: 'hadith_ref_aliases', columns: ['resource_id', 'old_number', 'new_number', 'match', 'since_version'] },
    ],
    entities: [
      { entity: 'hadith_collection', key: 'id' },
      { entity: 'hadith_book', key: 'id' },
      { entity: 'hadith_chapter', key: 'id' },
      { entity: 'hadith_entry', key: 'id' },
      { entity: 'hadith_grade', key: 'id' },
      { entity: 'hadith_ref_alias', key: '{old_number}:{since_version}' },
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
    name_ar: null,
    author_name: null,
    author_ar: null,
    language_code: 'ar',
    direction: 'rtl',
    version: 1,
    pack: { url: `/api/v1/content/packs/${overrides.id}/1`, size_bytes: 1, sha256: 'abc' },
    changes_since_min_version: 1,
    key: 'fixture-key',
    is_default: false,
    style: null,
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
    storage.remove(storageKeys.readerSettings);
    storage.remove(storageKeys.selectedResourceIds);
    storage.remove(storageKeys.locale);
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

  it('bumps the catalogue version after a pack import, so content screens re-read', async () => {
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
      const before = useCatalogVersion.getState().version;
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
      expect(useCatalogVersion.getState().version).toBeGreaterThan(before);
    });
  });

  it('installs no tafsir on the first sync without a reader choice', async () => {
    const bytes = gzipPack(85, [{ groupTafsirId: 1, html: EXACT }]);
    const hash = await sha256(bytes);
    const entry = resource({
      id: 85,
      version: 1,
      pack: { url: '/api/v1/content/packs/85/1', size_bytes: bytes.byteLength, sha256: hash },
    });
    const published = manifest([entry]);
    const downloadPack = jest.fn(async (_url: string, toPath: string) => {
      mkdirSync(parentDir(toPath), { recursive: true });
      writeFileSync(toPath, bytes);
    });

    await withContentDb(async ({ executor, cacheDir }) => {
      const report = await syncContent({
        ...(await deps(executor, cacheDir, {
          getManifest: async () => ({ status: 200, etag: published.etag, manifest: published.body }),
          getChanges: async () => {
            throw new Error('changes');
          },
          downloadPack,
        })),
        selection: selectedResourceIds,
      });

      expect(report.resources).toEqual([]);
      expect(downloadPack).not.toHaveBeenCalled();
      expect(tafsirHtml(executor, 85, 1)).toBeUndefined();
      expect(executor.get('SELECT resource_id FROM installed_resources WHERE resource_id = ?', [85])).toBeUndefined();
    });
  });

  it('removes an installed tafsir that is neither chosen nor installed on demand', async () => {
    const bytes = gzipPack(85, [{ groupTafsirId: 1, html: EXACT }]);
    const hash = await sha256(bytes);
    const entry = resource({
      id: 85,
      version: 1,
      pack: { url: '/api/v1/content/packs/85/1', size_bytes: bytes.byteLength, sha256: hash },
    });
    const published = manifest([entry]);
    const downloadPack = jest.fn(async () => undefined);

    await withContentDb(async ({ executor, cacheDir }) => {
      installTafsir(executor, 85, 1, [{ groupTafsirId: 1, html: 'drop-me' }]);
      const report = await syncContent({
        ...(await deps(executor, cacheDir, {
          getManifest: async () => ({ status: 200, etag: published.etag, manifest: published.body }),
          getChanges: async () => {
            throw new Error('changes');
          },
          downloadPack,
        })),
        selection: selectedResourceIds,
      });

      expect(report.resources).toEqual([{ resourceId: 85, status: 'removed' }]);
      expect(downloadPack).not.toHaveBeenCalled();
      expect(tafsirHtml(executor, 85, 1)).toBeUndefined();
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
      seedCatalog(executor, [85, 86]);
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

  it('with a stored ETag and a filled catalogue, a 304 leaves the catalogue as it is', async () => {
    const downloadPack = jest.fn();

    await withContentDb(async ({ executor, cacheDir }) => {
      installTafsir(executor, 85, 1, [{ groupTafsirId: 1, html: 'kept' }], 10);
      seedCatalog(executor, [85]);
      const before = catalogRows(executor);
      executor.run('INSERT INTO meta (key, value) VALUES (?, ?)', ['manifest_etag', '"same"']);
      const getManifest = jest.fn(async (_etag?: string) => ({ status: 304 as const }));

      await syncContent(
        await deps(executor, cacheDir, {
          getManifest,
          getChanges: async () => {
            throw new Error('changes');
          },
          downloadPack,
        }),
      );

      expect(getManifest).toHaveBeenCalledWith('"same"');
      expect(catalogRows(executor)).toEqual(before);
      expect(catalogRows(executor)).toHaveLength(1);
      expect(downloadPack).not.toHaveBeenCalled();
    });
  });

  it('with a stored ETag and an empty catalogue, asks without If-None-Match and writes the catalogue from the 200', async () => {
    const entry = resource({ id: 85, version: 1, name: 'Al-Muyassar', name_ar: 'التفسير الميسر' });
    const published = manifest([entry], '"fresh"');
    const downloadPack = jest.fn();

    await withContentDb(async ({ executor, cacheDir }) => {
      installTafsir(executor, 85, 1, [{ groupTafsirId: 1, html: 'kept' }], 10);
      executor.run('INSERT INTO meta (key, value) VALUES (?, ?)', ['manifest_etag', '"stale"']);
      const getManifest = jest.fn(async (_etag?: string) => ({
        status: 200 as const,
        etag: published.etag,
        manifest: published.body,
      }));

      const versionBefore = useCatalogVersion.getState().version;
      await syncContent(
        await deps(executor, cacheDir, {
          getManifest,
          getChanges: async () => {
            throw new Error('changes');
          },
          downloadPack,
        }),
      );

      expect(getManifest).toHaveBeenCalledTimes(1);
      expect(getManifest).toHaveBeenCalledWith(undefined);
      expect(catalogRows(executor).map((row) => row.resourceId)).toEqual([85]);
      // Screens mounted before the first sync re-read the catalogue when it lands.
      expect(useCatalogVersion.getState().version).toBeGreaterThan(versionBefore);
      expect(installedNames(executor, 85)).toMatchObject({ name: 'Al-Muyassar', nameAr: 'التفسير الميسر' });
      expect(executor.get<{ value: string }>('SELECT value FROM meta WHERE key = ?', ['manifest_etag'])?.value).toBe('"fresh"');
      expect(downloadPack).not.toHaveBeenCalled();
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
      // Only the catalogue rewrite ran; the rejected pack opened no transaction.
      expect(transactions()).toBe(1);
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
      // Catalogue rewrite, then the pack import.
      expect(transactions()).toBe(2);
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
      // Catalogue rewrite, then the changes transaction.
      expect(transactions()).toBe(2);
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
      // Catalogue rewrite, then the pack fallback.
      expect(transactions()).toBe(2);
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

  it('removes an installed azkar resource the manifest no longer lists, with its rows, and keeps the listed one', async () => {
    const published = manifest([resource({ id: 2, group: 'azkar', version: 1 })]);
    const onResourceRemoved = jest.fn();

    await withContentDb(async ({ executor, cacheDir }) => {
      for (const resourceId of [2, 3]) {
        executor.run(
          `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at)
           VALUES (?, 'azkar', 1, 'hash', 0)`,
          [resourceId],
        );
        executor.run(
          `INSERT INTO azkar_categories (resource_id, id, kind, position, occasion, progress_period)
           VALUES (?, 'morning', 'session', 1, 'morning', 'daily')`,
          [resourceId],
        );
      }
      const report = await syncContent({
        ...(await deps(executor, cacheDir, {
          getManifest: async () => ({ status: 200, etag: published.etag, manifest: published.body }),
          getChanges: async () => {
            throw new Error('changes');
          },
          downloadPack: async () => {
            throw new Error('no pack is needed');
          },
        })),
        selection: () => [2],
        onResourceRemoved,
      });

      expect(report.resources).toEqual([
        { resourceId: 3, status: 'removed' },
        { resourceId: 2, status: 'unchanged' },
      ]);
      expect(onResourceRemoved).toHaveBeenCalledWith(3, 'azkar');
      expect(executor.all('SELECT resource_id AS resourceId FROM azkar_categories')).toEqual([{ resourceId: 2 }]);
      expect(
        executor.all<{ resourceId: number }>(
          `SELECT resource_id AS resourceId FROM installed_resources WHERE "group" = 'azkar'`,
        ),
      ).toEqual([{ resourceId: 2 }]);
    });
  });

  it('reports a removed recitation pack to onResourceRemoved, so its downloads can go with it', async () => {
    const published = manifest([]);
    const onResourceRemoved = jest.fn();

    await withContentDb(async ({ executor, cacheDir }) => {
      executor.run(
        `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at, name, name_ar)
         VALUES (30, 'chapter_recitations', 1, 'a', 0, 'Mishari', 'مشاري')`,
      );
      const report = await syncContent({
        ...(await deps(executor, cacheDir, {
          getManifest: async () => ({ status: 200, etag: published.etag, manifest: published.body }),
          getChanges: async () => {
            throw new Error('changes');
          },
          downloadPack: async () => {
            throw new Error('no pack is published');
          },
        })),
        selection: () => [],
        onResourceRemoved,
      });

      expect(report.resources).toEqual([{ resourceId: 30, status: 'removed' }]);
      expect(onResourceRemoved).toHaveBeenCalledWith(30, 'chapter_recitations');
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

describe('catalogNeedsManifest', () => {
  it('is true while the catalogue is empty', async () => {
    await withContentDb(async ({ executor }) => {
      expect(catalogNeedsManifest(executor)).toBe(true);
    });
  });

  it('is true when an installed resource has neither a name nor an Arabic name', async () => {
    await withContentDb(async ({ executor }) => {
      installTafsir(executor, 85, 1, [{ groupTafsirId: 1, html: 'kept' }]);
      seedCatalog(executor, [85]);
      executor.run('UPDATE installed_resources SET name = NULL, name_ar = NULL WHERE resource_id = ?', [85]);

      expect(catalogNeedsManifest(executor)).toBe(true);
    });
  });

  it('is false when the catalogue is filled and every installed resource is named', async () => {
    await withContentDb(async ({ executor }) => {
      installTafsir(executor, 85, 1, [{ groupTafsirId: 1, html: 'kept' }]);
      seedCatalog(executor, [85]);

      expect(catalogNeedsManifest(executor)).toBe(false);
    });
  });

  it('is false when only the English name is missing', async () => {
    await withContentDb(async ({ executor }) => {
      installTafsir(executor, 85, 1, [{ groupTafsirId: 1, html: 'kept' }]);
      seedCatalog(executor, [85]);
      executor.run('UPDATE installed_resources SET name = NULL WHERE resource_id = ?', [85]);

      expect(catalogNeedsManifest(executor)).toBe(false);
    });
  });
});

function seedCatalog(executor: SqlExecutor, resourceIds: number[]): void {
  for (const resourceId of resourceIds) {
    executor.run(
      `INSERT INTO catalog_resources (resource_id, "group", name, name_ar, author_name, language_code, direction, version, pack_size_bytes)
       VALUES (?, 'tafsirs', 'Test', 'اختبار', NULL, 'ar', 'rtl', 1, 1)`,
      [resourceId],
    );
    executor.run('UPDATE installed_resources SET name = ?, name_ar = ? WHERE resource_id = ?', ['Test', 'اختبار', resourceId]);
  }
}

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

type CatalogRow = {
  resourceId: number;
  group: string;
  name: string | null;
  nameAr: string | null;
  authorName: string | null;
  authorAr: string | null;
  languageCode: string | null;
  direction: string | null;
  version: number;
  packSizeBytes: number;
};

function catalogRows(executor: SqlExecutor): CatalogRow[] {
  return executor.all<CatalogRow>(
    `SELECT resource_id AS resourceId, "group" AS "group", name, name_ar AS nameAr, author_name AS authorName,
            author_ar AS authorAr, language_code AS languageCode, direction, version, pack_size_bytes AS packSizeBytes
     FROM catalog_resources ORDER BY resource_id`,
  );
}

function catalogStyles(executor: SqlExecutor): { resourceId: number; style: string | null }[] {
  return executor.all<{ resourceId: number; style: string | null }>(
    'SELECT resource_id AS resourceId, style FROM catalog_resources ORDER BY resource_id',
  );
}

function catalogDefaults(executor: SqlExecutor): { resourceId: number; isDefault: number }[] {
  return executor.all<{ resourceId: number; isDefault: number }>(
    'SELECT resource_id AS resourceId, is_default AS isDefault FROM catalog_resources ORDER BY resource_id',
  );
}

function installedNames(executor: SqlExecutor, resourceId: number): Omit<CatalogRow, 'resourceId' | 'group' | 'version' | 'packSizeBytes'> | undefined {
  return executor.get(
    `SELECT name, name_ar AS nameAr, author_name AS authorName, author_ar AS authorAr, language_code AS languageCode, direction
     FROM installed_resources WHERE resource_id = ?`,
    [resourceId],
  );
}

function downloadInto(bytes: Uint8Array): (url: string, toPath: string) => Promise<void> {
  return async (_url, toPath) => {
    mkdirSync(parentDir(toPath), { recursive: true });
    writeFileSync(toPath, bytes);
  };
}

describe('device catalogue and resource names', () => {
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

  it('writes the manifest to the catalogue and the names to the installed tafsir', async () => {
    const bytes = gzipPack(85, [{ groupTafsirId: 1, html: EXACT }]);
    const installed = resource({
      id: 85,
      name: 'Al-Muyassar',
      name_ar: 'التفسير الميسر',
      author_name: 'نخبة من العلماء',
      author_ar: 'نخبة من العلماء',
      language_code: 'ar',
      direction: 'rtl',
      version: 3,
      pack: { url: '/api/v1/content/packs/85/3', size_bytes: bytes.byteLength, sha256: await sha256(bytes) },
    });
    const available = resource({
      id: 170,
      name: "Al-Sa'di",
      name_ar: 'تفسير السعدي',
      author_name: null,
      author_ar: null,
      language_code: 'ar',
      direction: 'rtl',
      version: 1,
      pack: { url: '/api/v1/content/packs/170/1', size_bytes: 2048, sha256: 'unused' },
    });
    const published = manifest([installed, available]);

    await withContentDb(async ({ executor, cacheDir }) => {
      const report = await syncContent(
        await deps(executor, cacheDir, {
          getManifest: async () => ({ status: 200, etag: published.etag, manifest: published.body }),
          getChanges: async () => {
            throw new Error('changes');
          },
          downloadPack: downloadInto(bytes),
        }),
      );

      expect(report.resources).toEqual([{ resourceId: 85, status: 'pack-imported' }]);
      expect(catalogRows(executor)).toEqual([
        {
          resourceId: 85,
          group: 'tafsirs',
          name: 'Al-Muyassar',
          nameAr: 'التفسير الميسر',
          authorName: 'نخبة من العلماء',
          authorAr: 'نخبة من العلماء',
          languageCode: 'ar',
          direction: 'rtl',
          version: 3,
          packSizeBytes: bytes.byteLength,
        },
        {
          resourceId: 170,
          group: 'tafsirs',
          name: "Al-Sa'di",
          nameAr: 'تفسير السعدي',
          authorName: null,
          authorAr: null,
          languageCode: 'ar',
          direction: 'rtl',
          version: 1,
          packSizeBytes: 2048,
        },
      ]);
      expect(installedNames(executor, 85)).toEqual({
        name: 'Al-Muyassar',
        nameAr: 'التفسير الميسر',
        authorName: 'نخبة من العلماء',
        authorAr: 'نخبة من العلماء',
        languageCode: 'ar',
        direction: 'rtl',
      });
    });
  });

  it('writes is_default into the catalogue as 1 or 0, and as 0 when an older API omits it', async () => {
    const bytes = gzipPack(85, [{ groupTafsirId: 1, html: EXACT }]);
    const pack = { url: '/api/v1/content/packs/85/3', size_bytes: bytes.byteLength, sha256: await sha256(bytes) };
    const withFlag = (etag: string, flag: boolean | undefined) => {
      const entry: ContentManifestResource = resource({ id: 85, version: 3, name: 'Afasy', pack, is_default: flag ?? false });
      if (flag === undefined) {
        delete (entry as Partial<ContentManifestResource>).is_default;
      }
      return manifest([entry], etag);
    };
    let current = withFlag('"flag-true"', true);
    const api: ContentApi = {
      getManifest: async () => ({ status: 200, etag: current.etag, manifest: current.body }),
      getChanges: async () => {
        throw new Error('changes');
      },
      downloadPack: downloadInto(bytes),
    };

    await withContentDb(async ({ executor, cacheDir }) => {
      await syncContent(await deps(executor, cacheDir, api));
      expect(catalogDefaults(executor)).toEqual([{ resourceId: 85, isDefault: 1 }]);

      current = withFlag('"flag-false"', false);
      await syncContent(await deps(executor, cacheDir, api));
      expect(catalogDefaults(executor)).toEqual([{ resourceId: 85, isDefault: 0 }]);

      current = withFlag('"flag-missing"', undefined);
      await syncContent(await deps(executor, cacheDir, api));
      expect(catalogDefaults(executor)).toEqual([{ resourceId: 85, isDefault: 0 }]);
    });
  });

  it('writes the recitation style into the catalogue, and null for a tafsir or a missing value', async () => {
    const bytes = gzipPack(85, [{ groupTafsirId: 1, html: EXACT }]);
    const pack = { url: '/api/v1/content/packs/85/3', size_bytes: bytes.byteLength, sha256: await sha256(bytes) };
    const withoutStyle = resource({ id: 31, group: 'chapter_recitations', name: 'Husary' });
    delete (withoutStyle as Partial<ContentManifestResource>).style;
    const body = manifest(
      [
        resource({ id: 30, group: 'chapter_recitations', name: 'Afasy', style: 'Murattal' }),
        withoutStyle,
        resource({ id: 85, version: 3, name: 'Tafsir', style: null, pack }),
      ],
      '"styles"',
    );
    const api: ContentApi = {
      getManifest: async () => ({ status: 200, etag: body.etag, manifest: body.body }),
      getChanges: async () => {
        throw new Error('changes');
      },
      downloadPack: downloadInto(bytes),
    };

    await withContentDb(async ({ executor, cacheDir }) => {
      await syncContent(await deps(executor, cacheDir, api));

      expect(catalogStyles(executor)).toEqual([
        { resourceId: 30, style: 'Murattal' },
        { resourceId: 31, style: null },
        { resourceId: 85, style: null },
      ]);
    });
  });

  it('refreshes author_ar in both tables from a later manifest when only the Arabic author changed', async () => {
    const bytes = gzipPack(85, [{ groupTafsirId: 1, html: EXACT }]);
    const pack = { url: '/api/v1/content/packs/85/3', size_bytes: bytes.byteLength, sha256: await sha256(bytes) };
    const before = manifest([resource({ id: 85, version: 3, name: 'Ibn Kathir', author_name: 'Hafiz Ibn Kathir', author_ar: null, pack })], '"v1"');
    const after = manifest([resource({ id: 85, version: 3, name: 'Ibn Kathir', author_name: 'Hafiz Ibn Kathir', author_ar: 'ابن كثير', pack })], '"v2"');
    let current = before;
    const downloadPack = jest.fn(downloadInto(bytes));

    await withContentDb(async ({ executor, cacheDir }) => {
      const api: ContentApi = {
        getManifest: async () => ({ status: 200, etag: current.etag, manifest: current.body }),
        getChanges: async () => {
          throw new Error('changes');
        },
        downloadPack,
      };
      await syncContent(await deps(executor, cacheDir, api));
      expect(installedNames(executor, 85)?.authorAr).toBeNull();
      expect(catalogRows(executor)).toEqual([expect.objectContaining({ resourceId: 85, authorAr: null })]);

      current = after;
      const report = await syncContent(await deps(executor, cacheDir, api));

      expect(report.resources).toEqual([{ resourceId: 85, status: 'unchanged' }]);
      expect(downloadPack).toHaveBeenCalledTimes(1);
      expect(installedNames(executor, 85)).toMatchObject({ authorName: 'Hafiz Ibn Kathir', authorAr: 'ابن كثير' });
      expect(catalogRows(executor)).toEqual([expect.objectContaining({ resourceId: 85, authorAr: 'ابن كثير' })]);
    });
  });

  it('renames an installed tafsir from a later manifest without downloading its pack', async () => {
    const bytes = gzipPack(85, [{ groupTafsirId: 1, html: EXACT }]);
    const hash = await sha256(bytes);
    const pack = { url: '/api/v1/content/packs/85/3', size_bytes: bytes.byteLength, sha256: hash };
    const before = manifest([resource({ id: 85, version: 3, name: 'Old name', name_ar: null, pack })], '"v1"');
    const after = manifest([resource({ id: 85, version: 3, name: 'Al-Muyassar', name_ar: 'التفسير الميسر', pack })], '"v2"');
    let current = before;
    const downloadPack = jest.fn(downloadInto(bytes));

    await withContentDb(async ({ executor, cacheDir }) => {
      const api: ContentApi = {
        getManifest: async () => ({ status: 200, etag: current.etag, manifest: current.body }),
        getChanges: async () => {
          throw new Error('changes');
        },
        downloadPack,
      };
      await syncContent(await deps(executor, cacheDir, api));
      expect(installedNames(executor, 85)?.name).toBe('Old name');

      current = after;
      const report = await syncContent(await deps(executor, cacheDir, api));

      expect(report.resources).toEqual([{ resourceId: 85, status: 'unchanged' }]);
      expect(downloadPack).toHaveBeenCalledTimes(1);
      expect(installedNames(executor, 85)).toMatchObject({ name: 'Al-Muyassar', nameAr: 'التفسير الميسر' });
      expect(catalogRows(executor)).toEqual([expect.objectContaining({ resourceId: 85, name: 'Al-Muyassar', nameAr: 'التفسير الميسر' })]);
    });
  });

  it('removes a resource from the catalogue when a later manifest no longer lists it', async () => {
    const keep = resource({ id: 85, version: 1, pack: { url: '/api/v1/content/packs/85/1', size_bytes: 1, sha256: 'x' } });
    const gone = resource({ id: 170, version: 1, pack: { url: '/api/v1/content/packs/170/1', size_bytes: 2, sha256: 'y' } });
    const first = manifest([keep, gone], '"v1"');
    const second = manifest([keep], '"v2"');
    let current = first;

    await withContentDb(async ({ executor, cacheDir }) => {
      const api: ContentApi = {
        getManifest: async () => ({ status: 200, etag: current.etag, manifest: current.body }),
        getChanges: async () => {
          throw new Error('changes');
        },
        downloadPack: downloadInto(new Uint8Array()),
      };
      await syncContent(await deps(executor, cacheDir, { ...api }));
      expect(catalogRows(executor).map((row) => row.resourceId)).toEqual([85, 170]);

      current = second;
      await syncContent(await deps(executor, cacheDir, api));
      expect(catalogRows(executor).map((row) => row.resourceId)).toEqual([85]);
    });
  });
});

