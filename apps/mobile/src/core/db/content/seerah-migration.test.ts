import { getTableColumns } from 'drizzle-orm';

import type { SqlExecutor } from '@/core/db/sql-executor';
import * as schema from '@/core/db/content/schema';
import { contentGroup } from '@/core/sync/content-tables';

import { openAzkarContentDb } from '../../../../jest/azkar-test-db';

// ADR 0089, Phase 8 step 24: the device tables mirror the Seerah pack contract (PackSchema::seerah*, PHP). The expected list
// below is that contract written out by hand, so a change on either side fails here.

type Expected = { name: string; primaryKey: string[]; columns: [string, 'integer' | 'real' | 'text', boolean][] };

const CONTRACT: Expected[] = [
  {
    name: 'seerah_books',
    primaryKey: ['resource_id', 'id'],
    columns: [
      ['resource_id', 'integer', false], ['id', 'integer', false], ['slug', 'text', false], ['title_ar', 'text', false],
      ['author_ar', 'text', false], ['edition_ar', 'text', false], ['attribution_ar', 'text', false], ['attribution_en', 'text', false],
      ['sections_count', 'integer', false], ['paragraphs_count', 'integer', false], ['places_count', 'integer', false],
      ['events_count', 'integer', false], ['routes_count', 'integer', false],
    ],
  },
  {
    name: 'seerah_sections',
    primaryKey: ['resource_id', 'id'],
    columns: [
      ['resource_id', 'integer', false], ['id', 'integer', false], ['code', 'text', false], ['level', 'text', false],
      ['title_ar', 'text', false], ['page', 'integer', false], ['position', 'integer', false],
      ['paragraph_from', 'integer', true], ['paragraph_to', 'integer', true],
    ],
  },
  {
    name: 'seerah_paragraphs',
    primaryKey: ['resource_id', 'id'],
    columns: [
      ['resource_id', 'integer', false], ['id', 'integer', false], ['section_id', 'integer', false],
      ['position', 'integer', false], ['page', 'integer', false], ['text_ar', 'text', false],
    ],
  },
  {
    name: 'seerah_places',
    primaryKey: ['resource_id', 'id'],
    columns: [
      ['resource_id', 'integer', false], ['id', 'integer', false], ['slug', 'text', false], ['parent_id', 'integer', true],
      ['kind', 'text', false], ['name_ar', 'text', false], ['lat', 'real', true], ['lng', 'real', true],
      ['geo_precision', 'text', true], ['flags', 'text', false],
    ],
  },
  {
    name: 'seerah_map_levels',
    primaryKey: ['resource_id', 'level'],
    columns: [
      ['resource_id', 'integer', false], ['level', 'text', false], ['parent_place_id', 'integer', false],
      ['viewbox', 'text', false], ['art', 'text', false],
    ],
  },
  {
    name: 'seerah_map_positions',
    primaryKey: ['resource_id', 'level', 'place_id'],
    columns: [
      ['resource_id', 'integer', false], ['level', 'text', false], ['place_id', 'integer', false], ['x', 'real', false],
      ['y', 'real', false], ['label_priority', 'integer', false], ['label_side', 'text', false],
      // Migration 0018 (ADR 0089 amendment): nullable, so a pack built before it still installs.
      ['art_landmark', 'integer', true],
    ],
  },
  {
    name: 'seerah_routes',
    primaryKey: ['resource_id', 'id'],
    columns: [
      ['resource_id', 'integer', false], ['id', 'integer', false], ['slug', 'text', false], ['kind', 'text', false],
      ['name_ar', 'text', false],
    ],
  },
  {
    name: 'seerah_route_stops',
    primaryKey: ['resource_id', 'route_id', 'position'],
    columns: [
      ['resource_id', 'integer', false], ['route_id', 'integer', false], ['position', 'integer', false],
      ['place_id', 'integer', false],
    ],
  },
  {
    name: 'seerah_map_route_paths',
    primaryKey: ['resource_id', 'level', 'route_id', 'from_place_id', 'to_place_id'],
    columns: [
      ['resource_id', 'integer', false], ['level', 'text', false], ['route_id', 'integer', false],
      ['from_place_id', 'integer', false], ['to_place_id', 'integer', false], ['path_d', 'text', false],
    ],
  },
  {
    name: 'seerah_events',
    primaryKey: ['resource_id', 'id'],
    columns: [
      ['resource_id', 'integer', false], ['id', 'integer', false], ['slug', 'text', false], ['position', 'integer', false],
      ['section_id', 'integer', false], ['paragraph_from', 'integer', true], ['paragraph_to', 'integer', true],
      ['title_ar', 'text', false], ['kind', 'text', false], ['place_id', 'integer', true], ['place_basis', 'text', true],
      ['also', 'text', false], ['age_from', 'integer', true], ['age_to', 'integer', true], ['era', 'text', true],
      ['hijri_from', 'integer', true], ['hijri_to', 'integer', true], ['year_basis', 'text', true],
      ['certainty', 'text', true], ['route_id', 'integer', true], ['flags', 'text', false],
    ],
  },
  {
    name: 'seerah_event_evidence',
    primaryKey: ['resource_id', 'event_id', 'kind', 'position'],
    columns: [
      ['resource_id', 'integer', false], ['event_id', 'integer', false], ['kind', 'text', false],
      ['position', 'integer', false], ['paragraph_id', 'integer', false], ['quote_ar', 'text', false],
    ],
  },
  {
    name: 'seerah_milestones',
    primaryKey: ['resource_id', 'milestone_key'],
    columns: [
      ['resource_id', 'integer', false], ['milestone_key', 'text', false], ['label_ar', 'text', false],
      ['event_id', 'integer', false], ['position', 'integer', false],
    ],
  },
];

const DRIZZLE_TABLES = {
  seerah_books: schema.seerahBooks,
  seerah_sections: schema.seerahSections,
  seerah_paragraphs: schema.seerahParagraphs,
  seerah_places: schema.seerahPlaces,
  seerah_map_levels: schema.seerahMapLevels,
  seerah_map_positions: schema.seerahMapPositions,
  seerah_routes: schema.seerahRoutes,
  seerah_route_stops: schema.seerahRouteStops,
  seerah_map_route_paths: schema.seerahMapRoutePaths,
  seerah_events: schema.seerahEvents,
  seerah_event_evidence: schema.seerahEventEvidence,
  seerah_milestones: schema.seerahMilestones,
} as const;

type SqliteColumn = { name: string; type: string; notnullFlag: number; pk: number };

function sqliteColumns(executor: SqlExecutor, table: string): SqliteColumn[] {
  return executor.all<SqliteColumn>(
    `SELECT name, type, "notnull" AS notnullFlag, pk FROM pragma_table_info('${table}') ORDER BY cid`,
  );
}

const SQLITE_TYPE: Record<'integer' | 'real' | 'text', string> = { integer: 'INTEGER', real: 'REAL', text: 'TEXT' };

describe('content.db seerah migration (ADR 0089)', () => {
  let database: ReturnType<typeof openAzkarContentDb>['database'];
  let executor: SqlExecutor;

  beforeEach(() => {
    const opened = openAzkarContentDb();
    database = opened.database;
    executor = opened.executor;
  });

  afterEach(() => {
    database.close();
  });

  it('matches the contract tables, their order and their primary keys', () => {
    const group = contentGroup('seerah');
    expect(group?.tables.map((table) => table.name)).toEqual(CONTRACT.map((table) => table.name));
    for (const expected of CONTRACT) {
      const table = group?.tables.find((item) => item.name === expected.name);
      expect(table?.columns.map((column) => [column.name, column.kind, column.nullable])).toEqual(
        expected.columns.map(([name, kind, nullable]) => [name, kind, nullable]),
      );
    }
  });

  it('creates every contract table with the contract columns, types, nullability and primary key', () => {
    for (const expected of CONTRACT) {
      const columns = sqliteColumns(executor, expected.name);
      expect(columns.map((column) => column.name)).toEqual(expected.columns.map(([name]) => name));

      for (const [name, kind, nullable] of expected.columns) {
        const found = columns.find((column) => column.name === name);
        expect(found?.type).toBe(SQLITE_TYPE[kind]);
        expect(found?.notnullFlag).toBe(nullable ? 0 : 1);
      }

      const keys = columns.filter((column) => column.pk > 0).sort((a, b) => a.pk - b.pk).map((column) => column.name);
      expect(keys).toEqual(expected.primaryKey);
    }
  });

  it('matches the Drizzle schema columns for every seerah table', () => {
    for (const expected of CONTRACT) {
      const drizzle = DRIZZLE_TABLES[expected.name as keyof typeof DRIZZLE_TABLES];
      const drizzleNames = Object.values(getTableColumns(drizzle)).map((column) => column.name);
      expect(sqliteColumns(executor, expected.name).map((column) => column.name)).toEqual(drizzleNames);
    }
  });

  it('keeps no review, provenance or import column on the device', () => {
    const hidden = ['source_id', 'source_version', 'source_sha256', 'canonical_sha256', 'imported_at', 'geo_source', 'text_sha256', 'origin', 'review_status', 'signed_by'];

    for (const expected of CONTRACT) {
      for (const column of sqliteColumns(executor, expected.name)) {
        expect(hidden).not.toContain(column.name);
      }
    }
  });

  it('keeps the coordinates REAL and every Arabic text column as TEXT', () => {
    const real = CONTRACT.flatMap((table) =>
      table.columns.filter(([, kind]) => kind === 'real').map(([name]) => `${table.name}.${name}`),
    );

    expect(real).toEqual(['seerah_places.lat', 'seerah_places.lng', 'seerah_map_positions.x', 'seerah_map_positions.y']);
  });
});

