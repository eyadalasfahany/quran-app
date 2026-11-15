import type { SqlExecutor, SqlValue } from '@/core/db/sql-executor';

import type { HadithPackRows } from '../../../hadith/data/__fixtures__/pack-test-helpers';

/**
 * TEST ONLY. A small placeholder Seerah pack: five places, two maps, five events. No text here is the book's; the paragraph
 * texts carry leading and trailing spaces, a diacritic and a right-to-left mark so a byte-exact round trip is checked.
 */

export const SEERAH_RESOURCE_ID = 77;

export const PARAGRAPH_TEXTS = [
  ' [نص تجريبي ١ — ليس من الكتاب]‏ ',
  '[نص تجريبي ٢ — ليس من الكتاب]َ',
  '[نص تجريبي ٣ — ليس من الكتاب]',
  '[نص تجريبي ٤ — ليس من الكتاب]',
  '[نص تجريبي ٥ — ليس من الكتاب]',
] as const;

const R = SEERAH_RESOURCE_ID;

function event(id: number, slug: string, overrides: Record<string, SqlValue> = {}): Record<string, SqlValue> {
  return {
    resource_id: R,
    id,
    slug,
    position: id,
    section_id: id + 2,
    paragraph_from: 9 + id,
    paragraph_to: 9 + id,
    title_ar: `[عنوان تجريبي ${id}]`,
    kind: 'event',
    place_id: 2,
    place_basis: 'stated',
    also: '[]',
    age_from: 40,
    age_to: 40,
    era: 'bh',
    hijri_from: 13,
    hijri_to: 13,
    year_basis: 'stated_age',
    certainty: 'stated',
    route_id: null,
    flags: '[]',
    ...overrides,
  };
}

export function seerahPackRows(): HadithPackRows {
  return {
    seerah_books: [
      {
        resource_id: R,
        id: 1,
        slug: 'fixture-book',
        title_ar: '[عنوان الكتاب التجريبي]',
        author_ar: '[المؤلف التجريبي]',
        edition_ar: '[طبعة تجريبية]',
        attribution_ar: '[نسبة تجريبية]',
        attribution_en: 'FIXTURE attribution',
        sections_count: 5,
        paragraphs_count: 5,
        places_count: 5,
        events_count: 5,
        routes_count: 1,
      },
    ],
    seerah_sections: [3, 4, 5, 6, 7].map((id, index) => ({
      resource_id: R,
      id,
      code: `s${String(id).padStart(3, '0')}`,
      level: 'heading',
      title_ar: `[عنوان تجريبي ${index + 1}]`,
      page: 10 + index,
      position: index + 1,
      paragraph_from: 10 + index,
      paragraph_to: 10 + index,
    })),
    seerah_paragraphs: PARAGRAPH_TEXTS.map((text, index) => ({
      resource_id: R,
      id: 10 + index,
      section_id: 3 + index,
      position: index + 1,
      page: 10 + index,
      text_ar: text,
    })),
    seerah_places: [
      { resource_id: R, id: 1, slug: 'arabia', parent_id: null, kind: 'region', name_ar: '[منطقة تجريبية]', lat: null, lng: null, geo_precision: null, flags: '[]' },
      { resource_id: R, id: 2, slug: 'makkah', parent_id: 1, kind: 'city', name_ar: '[مدينة تجريبية ١]', lat: 21.4, lng: 39.8, geo_precision: 'exact', flags: '[]' },
      { resource_id: R, id: 3, slug: 'makkah.kaaba', parent_id: 2, kind: 'landmark', name_ar: '[معلم تجريبي]', lat: null, lng: null, geo_precision: null, flags: '[]' },
      { resource_id: R, id: 4, slug: 'madinah', parent_id: 1, kind: 'city', name_ar: '[مدينة تجريبية ٢]', lat: 24.4, lng: 39.6, geo_precision: 'exact', flags: '[]' },
      { resource_id: R, id: 5, slug: 'other', parent_id: null, kind: 'region', name_ar: 'أخرى', lat: null, lng: null, geo_precision: null, flags: '[]' },
    ],
    seerah_map_levels: [
      { resource_id: R, level: 'region', parent_place_id: 1, viewbox: '0 0 1644 2400', art: 'design-assets/seerah/map-region.svg' },
      { resource_id: R, level: 'makkah', parent_place_id: 2, viewbox: '0 0 1600 1500', art: 'design-assets/seerah/map-makkah.svg' },
    ],
    seerah_map_positions: [
      { resource_id: R, level: 'region', place_id: 2, x: 897.7, y: 1357.8, label_priority: 100, label_side: 'end' },
      { resource_id: R, level: 'region', place_id: 4, x: 878, y: 1053.3, label_priority: 100, label_side: 'start' },
      { resource_id: R, level: 'makkah', place_id: 3, x: 800, y: 700, label_priority: 50, label_side: 'end', art_landmark: 1 },
    ],
    seerah_routes: [{ resource_id: R, id: 1, slug: 'r-hijra', kind: 'hijra', name_ar: '[رحلة تجريبية]' }],
    seerah_route_stops: [
      { resource_id: R, route_id: 1, position: 1, place_id: 2 },
      { resource_id: R, route_id: 1, position: 2, place_id: 4 },
    ],
    seerah_map_route_paths: [
      { resource_id: R, level: 'region', route_id: 1, from_place_id: 2, to_place_id: 4, path_d: 'M897.7,1357.8 L878,1053.3' },
    ],
    seerah_events: [
      event(1, 'e001', { age_from: 0, age_to: 0, era: 'bh', hijri_from: 53, hijri_to: 53 }),
      event(2, 'e002', { place_id: 3, age_from: 35, age_to: 35, also: '[4]', flags: '[{"code":"place_not_stated","note":null}]' }),
      event(3, 'e003', { place_id: 4, age_from: 53, age_to: 54, era: 'ah', route_id: 1, certainty: 'approximate' }),
      event(4, 'e004', {
        place_id: 5,
        place_basis: 'unstated',
        age_from: null,
        age_to: null,
        era: null,
        hijri_from: null,
        hijri_to: null,
        year_basis: 'unspecified',
        certainty: 'unspecified',
      }),
      event(5, 'e005', { place_id: 4, age_from: 63, age_to: 63, era: 'ah' }),
    ],
    seerah_event_evidence: [
      { resource_id: R, event_id: 3, kind: 'year', position: 1, paragraph_id: 12, quote_ar: '[اقتباس تجريبي]' },
      { resource_id: R, event_id: 3, kind: 'place', position: 1, paragraph_id: 12, quote_ar: '[اقتباس تجريبي ٢]' },
    ],
    seerah_milestones: [
      { resource_id: R, milestone_key: 'revelation', label_ar: '[معلم تجريبي]', event_id: 2, position: 2 },
      { resource_id: R, milestone_key: 'birth', label_ar: '[معلم تجريبي]', event_id: 1, position: 1 },
    ],
  };
}

/** Writes the rows straight into a migrated content.db and marks the pack installed (no network, no gzip). */
export function loadSeerahFixture(executor: SqlExecutor, rows: HadithPackRows = seerahPackRows()): void {
  executor.run(`INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at) VALUES (?, 'seerah', 1, 'x', 0)`, [
    SEERAH_RESOURCE_ID,
  ]);
  for (const [table, tableRows] of Object.entries(rows)) {
    for (const row of tableRows ?? []) {
      const names = Object.keys(row);
      executor.run(
        `INSERT INTO ${table} (${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')})`,
        names.map((name) => row[name] ?? null),
      );
    }
  }
}
