import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { gunzipSync, gzipSync } from 'node:zlib';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { writeCatalog } from '@/core/sync/content-sync';
import { installResourceWith } from '@/core/sync/install-resource';

import { at, openAzkarContentDb } from '../../../../jest/azkar-test-db';
import {
  apiWith,
  gzipHadithPack,
  installDeps,
  manifestBody,
  resource,
  serveFrom,
} from '../../hadith/data/__fixtures__/pack-test-helpers';
import {
  getSeerahBook,
  getSeerahCatalogEntry,
  getSeerahEvent,
  getSeerahEventNeighbours,
  getSeerahEventText,
  hasSeerahContent,
  listEventsOfAge,
  listEventsOfPlaceSubtree,
  listParagraphsOfSpan,
  listSeerahEvents,
  listSeerahEvidence,
  listSeerahMapLevels,
  listSeerahMilestones,
  listSeerahPlaces,
  listSeerahRoutes,
  listSeerahSections,
  paragraphCode,
} from './content-repository';
import { loadSeerahFixture, PARAGRAPH_TEXTS, SEERAH_RESOURCE_ID, seerahPackRows } from './__fixtures__/seerah-pack-rows';

describe('seerah content repository', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;

  beforeEach(() => {
    const opened = openAzkarContentDb();
    database = opened.database;
    executor = opened.executor;
  });

  afterEach(() => {
    database.close();
  });

  it('reports no content and returns nothing until the pack is installed', () => {
    expect(hasSeerahContent(executor)).toBe(false);
    expect(getSeerahBook(executor)).toBeUndefined();
    expect(listSeerahEvents(executor)).toEqual([]);
    expect(listSeerahPlaces(executor)).toEqual([]);
    expect(listSeerahMapLevels(executor)).toEqual([]);
    expect(getSeerahEvent(executor, 'e001')).toBeUndefined();
    expect(getSeerahEventNeighbours(executor, 'e001')).toBeUndefined();
  });

  describe('with the pack installed', () => {
    beforeEach(() => {
      loadSeerahFixture(executor);
    });

    it('reads the book row', () => {
      expect(hasSeerahContent(executor)).toBe(true);
      expect(getSeerahBook(executor)).toMatchObject({
        resourceId: SEERAH_RESOURCE_ID,
        slug: 'fixture-book',
        editionAr: '[طبعة تجريبية]',
        attributionEn: 'FIXTURE attribution',
        eventsCount: 5,
      });
    });

    it('reads the catalogue entry with its install state', () => {
      writeCatalog(executor, [
        resource({ id: SEERAH_RESOURCE_ID, group: 'seerah', key: 'nur-al-yaqin', version: 3, pack: { url: 'u', size_bytes: 2048, sha256: 'h' } }),
      ]);
      expect(getSeerahCatalogEntry(executor)).toEqual({ resourceId: SEERAH_RESOURCE_ID, version: 3, packSizeBytes: 2048, installed: true });
    });

    it('lists sections and the paragraphs of a span in book order', () => {
      expect(listSeerahSections(executor).map((section) => section.id)).toEqual(['s003', 's004', 's005', 's006', 's007']);
      const paragraphs = listParagraphsOfSpan(executor, 11, 13);
      expect(paragraphs.map((paragraph) => paragraph.id)).toEqual(['p00011', 'p00012', 'p00013']);
      expect(paragraphs.map((paragraph) => paragraph.position)).toEqual([2, 3, 4]);
    });

    it('round-trips the Arabic text byte for byte', () => {
      const [first, second] = listParagraphsOfSpan(executor, 10, 11);
      expect(first?.text).toBe(PARAGRAPH_TEXTS[0]);
      expect(Buffer.from(first?.text ?? '', 'utf8').equals(Buffer.from(PARAGRAPH_TEXTS[0], 'utf8'))).toBe(true);
      expect(second?.text).toBe(PARAGRAPH_TEXTS[1]);
      expect(getSeerahEvent(executor, 'e002')?.titleAr).toBe('[عنوان تجريبي 2]');
    });

    it('gives the text and first page of an event', () => {
      const text = getSeerahEventText(executor, 'e001');
      expect(text.paragraphs).toHaveLength(1);
      expect(text.paragraphs[0]?.text).toBe(PARAGRAPH_TEXTS[0]);
      expect(text.sourcePage).toBe(10);
      expect(getSeerahEventText(executor, 'missing')).toEqual({ paragraphs: [], sourcePage: null });
    });

    it('maps places to slugs with their parents', () => {
      const places = listSeerahPlaces(executor);
      expect(places.map((place) => [place.id, place.parentId, place.kind])).toEqual([
        ['arabia', null, 'region'],
        ['makkah', 'arabia', 'city'],
        ['makkah.kaaba', 'makkah', 'landmark'],
        ['madinah', 'arabia', 'city'],
        ['other', null, 'region'],
      ]);
    });

    it('maps the drawn levels, positions and route paths', () => {
      const levels = listSeerahMapLevels(executor);
      expect(levels.map((level) => level.id)).toEqual(['region', 'makkah']);
      const region = at(levels, 0);
      expect(region.viewbox).toEqual([0, 0, 1644, 2400]);
      expect(region.parentPlaceId).toBe('arabia');
      expect(region.positions.map((position) => position.placeId)).toEqual(['makkah', 'madinah']);
      expect(region.positions[1]?.labelSide).toBe('start');
      // The art draws the Kaaba (art_landmark 1); a NULL flag, as in the region rows here, is no landmark.
      expect(region.positions.map((position) => position.artLandmark)).toEqual([false, false]);
      expect(at(levels, 1).positions.map((position) => position.artLandmark)).toEqual([true]);
      expect(region.routePaths).toEqual([{ routeId: 'r-hijra', kind: 'hijra', d: 'M897.7,1357.8 L878,1053.3' }]);
      expect(region.zoom.cityThreshold).not.toBeNull();
      expect(region.areaLabels).toHaveLength(1);
      expect(at(levels, 1).zoom.fanOut).not.toBeNull();
      expect(at(levels, 1).areaLabels).toEqual([]);
    });

    it('maps routes with stops and events', () => {
      expect(listSeerahRoutes(executor)).toEqual([
        { id: 'r-hijra', kind: 'hijra', nameAr: '[رحلة تجريبية]', stops: ['makkah', 'madinah'], eventIds: ['e003'] },
      ]);
    });

    it('lists events in book order with their fields mapped', () => {
      const events = listSeerahEvents(executor);
      expect(events.map((event) => event.id)).toEqual(['e001', 'e002', 'e003', 'e004', 'e005']);
      expect(events[1]).toMatchObject({
        sectionId: 's004',
        placeId: 'makkah.kaaba',
        alsoPlaceIds: ['madinah'],
        flags: ['place_not_stated'],
        ageFrom: 35,
      });
      expect(events[2]).toMatchObject({ routeId: 'r-hijra', certainty: 'approximate', era: 'ah' });
      expect(events[3]).toMatchObject({ placeId: 'other', ageFrom: null, yearBasis: 'unspecified', era: null });
    });

    it('lists the events of an age, a range and the unspecified bucket', () => {
      expect(listEventsOfAge(executor, 35).map((event) => event.id)).toEqual(['e002']);
      expect(listEventsOfAge(executor, 54).map((event) => event.id)).toEqual(['e003']);
      expect(listEventsOfAge(executor, 10)).toEqual([]);
      expect(listEventsOfAge(executor, 'unspecified').map((event) => event.id)).toEqual(['e004']);
    });

    it('lists the events of a place subtree', () => {
      expect(listEventsOfPlaceSubtree(executor, 'makkah').map((event) => event.id)).toEqual(['e001', 'e002']);
      expect(listEventsOfPlaceSubtree(executor, 'makkah.kaaba').map((event) => event.id)).toEqual(['e002']);
      expect(listEventsOfPlaceSubtree(executor, 'arabia').map((event) => event.id)).toEqual(['e001', 'e002', 'e003', 'e005']);
      expect(listEventsOfPlaceSubtree(executor, 'nowhere')).toEqual([]);
    });

    it('finds the previous and next event in book order', () => {
      const middle = getSeerahEventNeighbours(executor, 'e003');
      expect(middle?.previous?.id).toBe('e002');
      expect(middle?.next?.id).toBe('e004');
      expect([middle?.index, middle?.total]).toEqual([3, 5]);
      expect(getSeerahEventNeighbours(executor, 'e001')?.previous).toBeNull();
      expect(getSeerahEventNeighbours(executor, 'e005')?.next).toBeNull();
    });

    it('lists the evidence and the milestones', () => {
      expect(listSeerahEvidence(executor, 'e003').map((item) => [item.kind, item.paragraphId])).toEqual([
        ['place', 'p00012'],
        ['year', 'p00012'],
      ]);
      expect(listSeerahMilestones(executor).map((mark) => [mark.key, mark.eventId])).toEqual([
        ['birth', 'e001'],
        ['bitha', 'e002'],
      ]);
    });

    it('keeps personal data out of content.db', () => {
      const tables = executor.all<{ name: string }>(`SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'seerah_%'`);
      for (const table of tables) {
        const columns = executor.all<{ name: string }>(`PRAGMA table_info(${table.name})`).map((column) => column.name);
        expect(columns.filter((name) => /bookmark|note|user|saved|last_read/.test(name))).toEqual([]);
      }
    });
  });

  it('formats a paragraph code', () => {
    expect(paragraphCode(123)).toBe('p00123');
  });
});

describe('seerah pack install', () => {
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

  it('installs the pack in one transaction and keeps the bytes', async () => {
    const cacheDir = mkdtempSync(join(tmpdir(), 'seerah-cache-'));
    const opened = openAzkarContentDb();
    try {
      const pack = gzipHadithPack(SEERAH_RESOURCE_ID, seerahPackRows(), 'seerah');
      const manifestResource = resource({
        id: SEERAH_RESOURCE_ID,
        group: 'seerah',
        key: 'nur-al-yaqin',
        pack: {
          url: `/api/v1/content/packs/${SEERAH_RESOURCE_ID}/1`,
          size_bytes: pack.length,
          sha256: createHash('sha256').update(pack).digest('hex'),
        },
      });
      const deps = installDeps(opened.executor, cacheDir, apiWith(manifestBody([manifestResource]), serveFrom(new Map([[SEERAH_RESOURCE_ID, pack]]))));
      const result = await installResourceWith(deps, SEERAH_RESOURCE_ID);
      expect(result).toEqual({ status: 'installed' });
      expect(hasSeerahContent(opened.executor)).toBe(true);
      expect(listSeerahEvents(opened.executor)).toHaveLength(5);
      expect(listParagraphsOfSpan(opened.executor, 10, 10)[0]?.text).toBe(PARAGRAPH_TEXTS[0]);
    } finally {
      opened.database.close();
      rmSync(cacheDir, { force: true, recursive: true });
    }
  });

  it('installs a pack built before art_landmark existed: every position reads as no landmark', async () => {
    const cacheDir = mkdtempSync(join(tmpdir(), 'seerah-cache-'));
    const opened = openAzkarContentDb();
    try {
      const pack = withoutColumn(gzipHadithPack(SEERAH_RESOURCE_ID, seerahPackRows(), 'seerah'), 'seerah_map_positions', 'art_landmark');
      const manifestResource = resource({
        id: SEERAH_RESOURCE_ID,
        group: 'seerah',
        key: 'nur-al-yaqin',
        pack: {
          url: `/api/v1/content/packs/${SEERAH_RESOURCE_ID}/1`,
          size_bytes: pack.length,
          sha256: createHash('sha256').update(pack).digest('hex'),
        },
      });
      const deps = installDeps(opened.executor, cacheDir, apiWith(manifestBody([manifestResource]), serveFrom(new Map([[SEERAH_RESOURCE_ID, pack]]))));
      expect(await installResourceWith(deps, SEERAH_RESOURCE_ID)).toEqual({ status: 'installed' });
      const positions = listSeerahMapLevels(opened.executor).flatMap((level) => level.positions);
      expect(positions.length).toBeGreaterThan(0);
      expect(positions.every((position) => position.artLandmark === false)).toBe(true);
    } finally {
      opened.database.close();
      rmSync(cacheDir, { force: true, recursive: true });
    }
  });

  it('leaves nothing behind when the pack fails its checksum', async () => {
    const cacheDir = mkdtempSync(join(tmpdir(), 'seerah-cache-'));
    const opened = openAzkarContentDb();
    try {
      const pack = gzipHadithPack(SEERAH_RESOURCE_ID, seerahPackRows(), 'seerah');
      const manifestResource = resource({
        id: SEERAH_RESOURCE_ID,
        group: 'seerah',
        pack: { url: `/api/v1/content/packs/${SEERAH_RESOURCE_ID}/1`, size_bytes: pack.length, sha256: 'bad' },
      });
      const deps = installDeps(opened.executor, cacheDir, apiWith(manifestBody([manifestResource]), serveFrom(new Map([[SEERAH_RESOURCE_ID, pack]]))));
      const result = await installResourceWith(deps, SEERAH_RESOURCE_ID);
      expect(result.status).toBe('failed');
      expect(hasSeerahContent(opened.executor)).toBe(false);
      expect(listSeerahEvents(opened.executor)).toEqual([]);
    } finally {
      opened.database.close();
      rmSync(cacheDir, { force: true, recursive: true });
    }
  });
});

/** A gzipped pack with one column dropped from one table: what a pack built before that column was added looks like. */
function withoutColumn(pack: Uint8Array, table: string, column: string): Uint8Array {
  const directory = mkdtempSync(join(tmpdir(), 'seerah-old-pack-'));
  const path = join(directory, 'pack.sqlite');
  try {
    writeFileSync(path, gunzipSync(pack));
    const database = new DatabaseSync(path);
    database.exec(`ALTER TABLE ${table} DROP COLUMN ${column}`);
    database.close();
    return new Uint8Array(gzipSync(readFileSync(path)));
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
}
