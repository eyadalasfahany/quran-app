import type { ContentManifestResource } from '@quran/api-contract';
import { createHash } from 'node:crypto';

import { syncContent } from '@/core/sync/content-sync';
import { installResourceWith } from '@/core/sync/install-resource';

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

const EXPLANATION_RESOURCE = 71;
const COLLECTION_RESOURCE = 61;

// Placeholder text only.
function explanationRows(resourceId: number, count: number): HadithPackRows {
  return {
    hadith_explanations: Array.from({ length: count }, (_, offset) => ({
      resource_id: resourceId,
      id: offset + 1,
      title_ar: null,
      attribution_ar: null,
      reference_ar: null,
      body_ar: `FIXTURE explanation ${offset + 1} — not a hadith`,
      benefits_ar: null,
      words_ar: null,
      intro_ar: null,
      source_url: 'https://example.test/fixture',
    })),
    hadith_explanation_links: Array.from({ length: count }, (_, offset) => ({
      resource_id: resourceId,
      collection_slug: 'fixture-collection',
      hadith_number: String(offset + 1),
      explanation_id: offset + 1,
    })),
  };
}

function publishExplanations(resourceId: number, version: number, pack: Uint8Array): ContentManifestResource {
  return resource({
    id: resourceId,
    version,
    group: 'hadith_explanations',
    key: '',
    pack: {
      url: `/api/v1/content/packs/${resourceId}/${version}`,
      size_bytes: pack.length,
      sha256: createHash('sha256').update(pack).digest('hex'),
    },
  });
}

function count(executor: Parameters<typeof installResourceWith>[0]['db'], table: string, resourceId: number): number {
  return executor.get<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table} WHERE resource_id = ?`, [resourceId])?.count ?? 0;
}

describe('hadith explanation pack install', () => {
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

  it('installs an explanation pack, records it as explanations and keeps it on demand', async () => {
    await withContentDb(async ({ executor, cacheDir }) => {
      const pack = gzipHadithPack(EXPLANATION_RESOURCE, explanationRows(EXPLANATION_RESOURCE, 2), 'hadith_explanations');
      const published = [publishExplanations(EXPLANATION_RESOURCE, 1, pack)];
      const outcome = await installResourceWith(
        installDeps(executor, cacheDir, apiWith(manifestBody(published), serveFrom(new Map([[EXPLANATION_RESOURCE, pack]])))),
        EXPLANATION_RESOURCE,
      );

      expect(outcome).toEqual({ status: 'installed' });
      expect(executor.get<{ group: string }>('SELECT "group" AS "group" FROM installed_resources WHERE resource_id = ?', [EXPLANATION_RESOURCE])?.group).toBe(
        'hadith_explanations',
      );
      expect(count(executor, 'hadith_explanations', EXPLANATION_RESOURCE)).toBe(2);
      expect(count(executor, 'hadith_explanation_links', EXPLANATION_RESOURCE)).toBe(2);
      expect(executor.get<{ value: string }>("SELECT value FROM meta WHERE key = 'on_demand_resource_ids'")?.value).toBe(
        `[${EXPLANATION_RESOURCE}]`,
      );
    });
  });

  it('keeps the explanations through the next sync when nothing selects them', async () => {
    await withContentDb(async ({ executor, cacheDir }) => {
      const pack = gzipHadithPack(EXPLANATION_RESOURCE, explanationRows(EXPLANATION_RESOURCE, 1), 'hadith_explanations');
      const published = [publishExplanations(EXPLANATION_RESOURCE, 1, pack)];
      await installResourceWith(
        installDeps(executor, cacheDir, apiWith(manifestBody(published), serveFrom(new Map([[EXPLANATION_RESOURCE, pack]])))),
        EXPLANATION_RESOURCE,
      );

      const report = await syncContent(
        syncDeps(executor, cacheDir, apiWith(manifestBody(published), serveFrom(new Map())), () => []),
      );

      expect(report.resources.find((item) => item.resourceId === EXPLANATION_RESOURCE)?.status).not.toBe('removed');
      expect(count(executor, 'hadith_explanations', EXPLANATION_RESOURCE)).toBe(1);
    });
  });

  it('installs alongside a collection without touching it', async () => {
    await withContentDb(async ({ executor, cacheDir }) => {
      const explanations = gzipHadithPack(EXPLANATION_RESOURCE, explanationRows(EXPLANATION_RESOURCE, 1), 'hadith_explanations');
      const collectionRows: HadithPackRows = {
        hadith_collections: [
          {
            resource_id: COLLECTION_RESOURCE,
            id: 1,
            slug: 'fixture-collection',
            source_code: 'taybah-dev-fixture',
            title_ar: null,
            title_en: 'FIXTURE title — not a hadith',
            author_ar: null,
            author_en: 'FIXTURE author',
            attribution_ar: 'FIXTURE attribution',
            attribution_en: 'FIXTURE attribution',
            source_url: null,
            total_hadith: 0,
            books_count: 0,
          },
        ],
      };
      const collection = gzipHadithPack(COLLECTION_RESOURCE, collectionRows);
      const published = [
        resource({ id: COLLECTION_RESOURCE, version: 1, group: 'hadith_collections', pack: { url: `/api/v1/content/packs/${COLLECTION_RESOURCE}/1`, size_bytes: collection.length, sha256: createHash('sha256').update(collection).digest('hex') } }),
        publishExplanations(EXPLANATION_RESOURCE, 1, explanations),
      ];
      const packs = new Map([
        [COLLECTION_RESOURCE, collection],
        [EXPLANATION_RESOURCE, explanations],
      ]);
      await installResourceWith(installDeps(executor, cacheDir, apiWith(manifestBody(published), serveFrom(packs))), EXPLANATION_RESOURCE);

      expect(count(executor, 'hadith_collections', COLLECTION_RESOURCE)).toBe(0);
      expect(count(executor, 'hadith_explanations', EXPLANATION_RESOURCE)).toBe(1);
      expect(executor.get<{ count: number }>('SELECT COUNT(*) AS count FROM installed_resources WHERE "group" = ?', ['hadith_collections'])?.count).toBe(0);
    });
  });

  it('rolls back the explanation install when a table is missing from the pack', async () => {
    await withContentDb(async ({ executor, cacheDir }) => {
      const rows = explanationRows(EXPLANATION_RESOURCE, 1);
      delete rows.hadith_explanation_links;
      const pack = gzipHadithPack(EXPLANATION_RESOURCE, rows, 'hadith_explanations');
      const published = [publishExplanations(EXPLANATION_RESOURCE, 1, pack)];
      const outcome = await installResourceWith(
        installDeps(executor, cacheDir, apiWith(manifestBody(published), serveFrom(new Map([[EXPLANATION_RESOURCE, pack]])))),
        EXPLANATION_RESOURCE,
      );

      expect(outcome).toEqual({ status: 'failed', reason: 'import' });
      expect(count(executor, 'hadith_explanations', EXPLANATION_RESOURCE)).toBe(0);
      expect(executor.get<{ count: number }>('SELECT COUNT(*) AS count FROM installed_resources WHERE resource_id = ?', [EXPLANATION_RESOURCE])?.count).toBe(0);
    });
  });
});
