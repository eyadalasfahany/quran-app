import type { ContentChange, ContentManifestResource } from '@quran/api-contract';
import { createHash } from 'node:crypto';

import type { SqlExecutor } from '@/core/db/sql-executor';
import type { ChangesResult, ManifestResult } from '@/core/api/content';
import type { ContentApi } from '@/core/sync/content-sync';
import { syncContent, writeCatalog } from '@/core/sync/content-sync';
import { installResourceWith, type InstallDeps } from '@/core/sync/install-resource';
import { normalizeHadithForSearch } from '@/core/text/normalizeHadithForSearch';

import {
  apiWith,
  gzipHadithPack,
  installDeps,
  manifestBody,
  resource,
  serveFrom,
  syncDeps,
  withContentDb,
  type HadithPackRows,
} from './__fixtures__/pack-test-helpers';

const COLLECTION_TABLES = [
  'hadith_collections',
  'hadith_books',
  'hadith_chapters',
  'hadith_entries',
  'hadith_grades',
  'hadith_ref_aliases',
] as const;

const ARABIC_TEXT = ' نص تجريبي ١ — ليس حديثًا‏ ';
const ARABIC_TITLE = '[عنوان تجريبي]';
const ATTRIBUTION = '[مصدر تجريبي]';

function shippedTextSearch(index: number): string {
  return `shipped ${index}`;
}

/** A complete placeholder pack for one collection: one book, `entryCount` entries, no chapters, no grades. */
function packRows(resourceId: number, slug: string, entryCount: number): HadithPackRows {
  const entries = Array.from({ length: entryCount }, (_, offset) => {
    const id = offset + 1;
    return {
      resource_id: resourceId,
      id,
      book_id: 1,
      chapter_id: null,
      hadith_number: String(id),
      arabic_number: null,
      position: id,
      text_ar: `FIXTURE text ${id} — not a hadith`,
      text_en: null,
      narrator_en: null,
      text_search: shippedTextSearch(id),
      source_url: null,
    };
  });
  return {
    hadith_collections: [
      {
        resource_id: resourceId,
        id: 1,
        slug,
        source_code: 'taybah-dev-fixture',
        title_ar: null,
        title_en: 'FIXTURE title — not a hadith',
        author_ar: null,
        author_en: 'FIXTURE author',
        attribution_ar: 'FIXTURE attribution',
        attribution_en: 'FIXTURE attribution',
        source_url: null,
        total_hadith: entryCount,
        books_count: 1,
      },
    ],
    hadith_books: [
      {
        resource_id: resourceId,
        id: 1,
        book_number: '1',
        title_ar: null,
        title_en: null,
        position: 1,
        hadith_count: entryCount,
      },
    ],
    hadith_chapters: [],
    hadith_entries: entries,
    hadith_grades: [],
    hadith_ref_aliases: [],
  };
}

/** The manifest entry for a gzipped pack; the checksum is the pack's own SHA-256, as the server publishes it. */
function publish(resourceId: number, version: number, pack: Uint8Array): ContentManifestResource {
  return resource({
    id: resourceId,
    version,
    group: 'hadith_collections',
    pack: {
      url: `/api/v1/content/packs/${resourceId}/${version}`,
      size_bytes: pack.length,
      sha256: createHash('sha256').update(pack).digest('hex'),
    },
  });
}

function depsFor(
  executor: SqlExecutor,
  cacheDir: string,
  resources: ContentManifestResource[],
  packs: Map<number, Uint8Array>,
): InstallDeps {
  return installDeps(executor, cacheDir, apiWith(manifestBody(resources), serveFrom(packs)));
}

function count(executor: SqlExecutor, table: string, resourceId: number): number {
  return executor.get<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table} WHERE resource_id = ?`, [resourceId])?.count ?? 0;
}

function snapshot(executor: SqlExecutor, resourceId: number): string {
  const parts = COLLECTION_TABLES.map((table) =>
    JSON.stringify(executor.all(`SELECT * FROM ${table} WHERE resource_id = ? ORDER BY 1, 2`, [resourceId])),
  );
  parts.push(JSON.stringify(executor.all('SELECT * FROM search_hadith WHERE resource_id = ? ORDER BY entry_id', [resourceId])));
  return parts.join('\n');
}

function installedRow(executor: SqlExecutor, resourceId: number): { group: string; version: number } | undefined {
  return executor.get<{ group: string; version: number }>(
    'SELECT "group" AS "group", version FROM installed_resources WHERE resource_id = ?',
    [resourceId],
  );
}

describe('hadith pack install', () => {
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

  it('stores the manifest key as the catalogue source key, and null when it is empty', async () => {
    await withContentDb(async ({ executor }) => {
      writeCatalog(executor, [
        resource({ id: 61, key: 'muslim' }),
        resource({ id: 62, key: '' }),
      ]);
      const keys = executor.all<{ resourceId: number; sourceKey: string | null }>(
        'SELECT resource_id AS resourceId, source_key AS sourceKey FROM catalog_resources ORDER BY resource_id',
      );
      expect(keys).toEqual([
        { resourceId: 61, sourceKey: 'muslim' },
        { resourceId: 62, sourceKey: null },
      ]);
    });
  });

  it('copies an alias row whose column is named match', async () => {
    await withContentDb(async ({ executor, cacheDir }) => {
      const rows = packRows(61, 'fixture-alias', 1);
      rows.hadith_ref_aliases = [{ resource_id: 61, old_number: '1', new_number: null, match: 'none', since_version: 1 }];
      const pack = gzipHadithPack(61, rows);
      const outcome = await installResourceWith(depsFor(executor, cacheDir, [publish(61, 1, pack)], new Map([[61, pack]])), 61);

      expect(outcome).toEqual({ status: 'installed' });
      const alias = executor.get<{ match: string; newNumber: string | null }>(
        'SELECT match, new_number AS newNumber FROM hadith_ref_aliases WHERE resource_id = 61',
      );
      expect(alias).toEqual({ match: 'none', newNumber: null });
    });
  });

  it('installs a hadith pack, fills search_hadith and records the resource', async () => {
    await withContentDb(async ({ executor, cacheDir }) => {
      const pack = gzipHadithPack(61, packRows(61, 'fixture-install', 3));
      const outcome = await installResourceWith(depsFor(executor, cacheDir, [publish(61, 1, pack)], new Map([[61, pack]])), 61);

      expect(outcome).toEqual({ status: 'installed' });
      expect(installedRow(executor, 61)).toEqual({ group: 'hadith_collections', version: 1 });
      expect(count(executor, 'hadith_collections', 61)).toBe(1);
      expect(count(executor, 'hadith_books', 61)).toBe(1);
      expect(count(executor, 'hadith_entries', 61)).toBe(3);
      expect(count(executor, 'search_hadith', 61)).toBe(3);
    });
  });

  it('stores Arabic text and titles byte for byte', async () => {
    await withContentDb(async ({ executor, cacheDir }) => {
      const rows = packRows(61, 'fixture-bytes', 1);
      const entry = rows.hadith_entries?.[0];
      if (entry === undefined) {
        throw new Error('Placeholder entry missing.');
      }
      entry.text_ar = ARABIC_TEXT;
      rows.hadith_collections = [{ ...rows.hadith_collections?.[0], title_ar: ARABIC_TITLE, attribution_ar: ATTRIBUTION }];
      const pack = gzipHadithPack(61, rows);
      await installResourceWith(depsFor(executor, cacheDir, [publish(61, 1, pack)], new Map([[61, pack]])), 61);

      const stored = executor.get<{ textHex: string; titleHex: string; attributionHex: string }>(
        `SELECT hex(text_ar) AS textHex,
                (SELECT hex(title_ar) FROM hadith_collections WHERE resource_id = 61) AS titleHex,
                (SELECT hex(attribution_ar) FROM hadith_collections WHERE resource_id = 61) AS attributionHex
         FROM hadith_entries WHERE resource_id = 61`,
      );
      const hex = (text: string) => Buffer.from(text, 'utf8').toString('hex').toUpperCase();
      expect(stored?.textHex).toBe(hex(ARABIC_TEXT));
      expect(stored?.titleHex).toBe(hex(ARABIC_TITLE));
      expect(stored?.attributionHex).toBe(hex(ATTRIBUTION));
    });
  });

  it('leaves text_search as shipped', async () => {
    await withContentDb(async ({ executor, cacheDir }) => {
      const pack = gzipHadithPack(61, packRows(61, 'fixture-shipped', 2));
      await installResourceWith(depsFor(executor, cacheDir, [publish(61, 1, pack)], new Map([[61, pack]])), 61);

      const rows = executor.all<{ id: number; textSearch: string }>(
        'SELECT id, text_search AS textSearch FROM hadith_entries WHERE resource_id = 61 ORDER BY id',
      );
      expect(rows.map((row) => row.textSearch)).toEqual([shippedTextSearch(1), shippedTextSearch(2)]);
      expect(rows[0]?.textSearch).not.toBe(normalizeHadithForSearch('FIXTURE text 1 — not a hadith'));
    });
  });

  it('keeps a null Arabic title null', async () => {
    await withContentDb(async ({ executor, cacheDir }) => {
      const pack = gzipHadithPack(61, packRows(61, 'fixture-null-title', 1));
      await installResourceWith(depsFor(executor, cacheDir, [publish(61, 1, pack)], new Map([[61, pack]])), 61);

      expect(executor.get<{ titleAr: string | null }>('SELECT title_ar AS titleAr FROM hadith_collections WHERE resource_id = 61')?.titleAr).toBeNull();
    });
  });

  it('rolls the whole install back when the FTS step fails', async () => {
    await withContentDb(async ({ executor, cacheDir }) => {
      executor.exec('DROP TABLE search_hadith');
      const pack = gzipHadithPack(61, packRows(61, 'fixture-fts', 2));
      const outcome = await installResourceWith(depsFor(executor, cacheDir, [publish(61, 1, pack)], new Map([[61, pack]])), 61);

      expect(outcome).toEqual({ status: 'failed', reason: 'import' });
      for (const table of ['hadith_collections', 'hadith_books', 'hadith_entries']) {
        expect(count(executor, table, 61)).toBe(0);
      }
      expect(installedRow(executor, 61)).toBeUndefined();
    });
  });

  it('rolls back a hadith pack when a table is missing from the pack', async () => {
    await withContentDb(async ({ executor, cacheDir }) => {
      const rows = packRows(61, 'fixture-missing', 2);
      delete rows.hadith_entries;
      const pack = gzipHadithPack(61, rows);
      const outcome = await installResourceWith(depsFor(executor, cacheDir, [publish(61, 1, pack)], new Map([[61, pack]])), 61);

      expect(outcome).toEqual({ status: 'failed', reason: 'import' });
      expect(count(executor, 'hadith_collections', 61)).toBe(0);
      expect(count(executor, 'hadith_books', 61)).toBe(0);
      expect(installedRow(executor, 61)).toBeUndefined();
    });
  });

  it('reinstalling replaces the collection rows and its FTS rows', async () => {
    await withContentDb(async ({ executor, cacheDir }) => {
      const first = gzipHadithPack(61, packRows(61, 'fixture-replace', 3));
      await installResourceWith(depsFor(executor, cacheDir, [publish(61, 1, first)], new Map([[61, first]])), 61);

      const second = gzipHadithPack(61, packRows(61, 'fixture-replace', 2));
      const outcome = await installResourceWith(depsFor(executor, cacheDir, [publish(61, 2, second)], new Map([[61, second]])), 61);

      expect(outcome).toEqual({ status: 'installed' });
      expect(count(executor, 'hadith_entries', 61)).toBe(2);
      expect(count(executor, 'search_hadith', 61)).toBe(2);
      expect(installedRow(executor, 61)?.version).toBe(2);
    });
  });

  it('rebuilds content.db from packs', async () => {
    await withContentDb(async ({ executor: first, cacheDir: firstCache }) => {
      await withContentDb(async ({ executor: second, cacheDir: secondCache }) => {
        const pack = gzipHadithPack(61, packRows(61, 'fixture-rebuild', 3));
        const manifest = [publish(61, 1, pack)];
        await installResourceWith(depsFor(first, firstCache, manifest, new Map([[61, pack]])), 61);
        await installResourceWith(depsFor(second, secondCache, manifest, new Map([[61, pack]])), 61);

        expect(snapshot(second, 61)).toBe(snapshot(first, 61));
      });
    });
  });

  it('keeps the collection through the next sync', async () => {
    await withContentDb(async ({ executor, cacheDir }) => {
      const pack = gzipHadithPack(61, packRows(61, 'fixture-keep', 2));
      const published = [publish(61, 1, pack)];
      await installResourceWith(depsFor(executor, cacheDir, published, new Map([[61, pack]])), 61);

      const report = await syncContent(syncDeps(executor, cacheDir, apiWith(manifestBody(published), serveFrom(new Map())), () => []));

      const status = report.resources.find((item) => item.resourceId === 61)?.status;
      expect(status).not.toBe('removed');
      expect(count(executor, 'hadith_entries', 61)).toBe(2);
      expect(count(executor, 'search_hadith', 61)).toBe(2);
    });
  });

  it('removes the FTS rows with the collection', async () => {
    await withContentDb(async ({ executor, cacheDir }) => {
      const pack = gzipHadithPack(61, packRows(61, 'fixture-remove', 2));
      await installResourceWith(depsFor(executor, cacheDir, [publish(61, 1, pack)], new Map([[61, pack]])), 61);

      const report = await syncContent(syncDeps(executor, cacheDir, apiWith(manifestBody([]), serveFrom(new Map())), () => []));

      expect(report.resources).toEqual([{ resourceId: 61, status: 'removed' }]);
      expect(count(executor, 'hadith_collections', 61)).toBe(0);
      expect(count(executor, 'search_hadith', 61)).toBe(0);
    });
  });

  it('does not touch another collection when one is installed', async () => {
    await withContentDb(async ({ executor, cacheDir }) => {
      const packA = gzipHadithPack(71, packRows(71, 'fixture-alpha', 2));
      const packB = gzipHadithPack(72, packRows(72, 'fixture-beta', 3));
      const packs = new Map([
        [71, packA],
        [72, packB],
      ]);
      const manifest = [publish(71, 1, packA), publish(72, 1, packB)];
      await installResourceWith(depsFor(executor, cacheDir, manifest, packs), 71);
      await installResourceWith(depsFor(executor, cacheDir, manifest, packs), 72);
      const before = snapshot(executor, 72);

      await installResourceWith(depsFor(executor, cacheDir, manifest, packs), 71);

      expect(snapshot(executor, 72)).toBe(before);
    });
  });

  it('refreshes search_hadith when a change-feed upsert arrives for an entry', async () => {
    await withContentDb(async ({ executor, cacheDir }) => {
      const pack = gzipHadithPack(61, packRows(61, 'fixture-changes', 2));
      await installResourceWith(depsFor(executor, cacheDir, [publish(61, 1, pack)], new Map([[61, pack]])), 61);

      const changedText = 'changed placeholder';
      const change: ContentChange = {
        entity: 'hadith_entry',
        op: 'upsert',
        entity_key: '1',
        payload: {
          resource_id: 61,
          id: 1,
          book_id: 1,
          chapter_id: null,
          hadith_number: '1',
          arabic_number: null,
          position: 1,
          text_ar: 'FIXTURE text 1 — not a hadith',
          text_en: null,
          narrator_en: null,
          text_search: changedText,
          source_url: null,
        },
      } as unknown as ContentChange;
      const feed: ChangesResult = { status: 200, page: { data: [change], next_cursor: null } } as unknown as ChangesResult;
      const api: ContentApi = {
        getManifest: async (): Promise<ManifestResult> => ({
          status: 200,
          etag: '"v2"',
          manifest: manifestBody([publish(61, 2, pack)]),
        }),
        getChanges: async () => feed,
        downloadPack: async () => {
          throw new Error('no pack download expected');
        },
      };

      await syncContent(syncDeps(executor, cacheDir, api, () => []));

      expect(installedRow(executor, 61)?.version).toBe(2);
      const indexed = executor.get<{ textSearch: string }>(
        'SELECT text_search AS textSearch FROM search_hadith WHERE entry_id = 1 AND resource_id = 61',
      );
      expect(indexed?.textSearch).toBe(changedText);
      expect(count(executor, 'search_hadith', 61)).toBe(2);
    });
  });
});
