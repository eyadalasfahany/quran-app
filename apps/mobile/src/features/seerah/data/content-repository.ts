import type { SqlExecutor } from '@/core/db/sql-executor';

import type {
  SeerahCertainty,
  SeerahEra,
  SeerahEvent,
  SeerahEventKind,
  SeerahLabelSide,
  SeerahMapLevel,
  SeerahMilestone,
  SeerahParagraph,
  SeerahPlace,
  SeerahPlaceBasis,
  SeerahPlaceKind,
  SeerahRoute,
  SeerahRouteKind,
  SeerahYearBasis,
} from '../types';
import { areaLabelsFor, milestoneKey, zoomForLevel } from './level-config';
import type { SeerahBook, SeerahCatalogEntry, SeerahEventText, SeerahEvidence, SeerahSection } from './model';

/**
 * Read-only queries over the installed Seerah pack (group `seerah`). Text columns are selected as stored: no trim, no
 * substr, no normalisation. Every function returns an empty list, `undefined` or `false` while the pack is not installed.
 */

const INSTALLED = `JOIN installed_resources r ON r.resource_id = {t}.resource_id AND r."group" = 'seerah'`;

function installed(alias: string): string {
  return INSTALLED.replace('{t}', alias);
}

/** `p00123`: the code the pack's numeric paragraph id came from. */
export function paragraphCode(id: number): string {
  return `p${String(id).padStart(5, '0')}`;
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function hasSeerahContent(db: SqlExecutor): boolean {
  try {
    return db.get<{ one: number }>(`SELECT 1 AS one FROM seerah_books b ${installed('b')} LIMIT 1`) !== undefined;
  } catch {
    return false;
  }
}

export function getSeerahBook(db: SqlExecutor): SeerahBook | undefined {
  return db.get<SeerahBook>(
    `SELECT b.resource_id AS resourceId, b.slug, b.title_ar AS titleAr, b.author_ar AS authorAr, b.edition_ar AS editionAr,
            b.attribution_ar AS attributionAr, b.attribution_en AS attributionEn, b.sections_count AS sectionsCount,
            b.paragraphs_count AS paragraphsCount, b.places_count AS placesCount, b.events_count AS eventsCount,
            b.routes_count AS routesCount
     FROM seerah_books b ${installed('b')}
     ORDER BY b.resource_id LIMIT 1`,
  );
}

/** The catalogue entry for the Seerah pack (installed or not), for the download state. */
export function getSeerahCatalogEntry(db: SqlExecutor): SeerahCatalogEntry | undefined {
  const row = db.get<Omit<SeerahCatalogEntry, 'installed'> & { installedFlag: number }>(
    `SELECT cr.resource_id AS resourceId, cr.version AS version, cr.pack_size_bytes AS packSizeBytes,
            CASE WHEN ir.resource_id IS NULL THEN 0 ELSE 1 END AS installedFlag
     FROM catalog_resources cr
     LEFT JOIN installed_resources ir ON ir.resource_id = cr.resource_id AND ir."group" = 'seerah'
     WHERE cr."group" = 'seerah'
     ORDER BY cr.resource_id LIMIT 1`,
  );
  return row === undefined
    ? undefined
    : { resourceId: row.resourceId, version: row.version, packSizeBytes: row.packSizeBytes, installed: row.installedFlag === 1 };
}

export function listSeerahSections(db: SqlExecutor): SeerahSection[] {
  return db
    .all<{ code: string; level: string; titleAr: string; page: number; position: number }>(
      `SELECT s.code, s.level, s.title_ar AS titleAr, s.page, s.position
       FROM seerah_sections s ${installed('s')} ORDER BY s.position`,
    )
    .map((row) => ({ id: row.code, level: row.level, titleAr: row.titleAr, page: row.page, position: row.position }));
}

/** The paragraphs with ids `from` to `to` (inclusive, the pack's numeric ids), in book order. */
export function listParagraphsOfSpan(db: SqlExecutor, from: number, to: number): SeerahParagraph[] {
  return db
    .all<{ id: number; position: number; page: number; textAr: string }>(
      `SELECT p.id, p.position, p.page, p.text_ar AS textAr
       FROM seerah_paragraphs p ${installed('p')}
       WHERE p.id BETWEEN ? AND ? ORDER BY p.position`,
      [from, to],
    )
    .map((row) => ({ id: paragraphCode(row.id), position: row.position, page: row.page, text: row.textAr }));
}

type PlaceRow = { id: number; slug: string; parentSlug: string | null; kind: string; nameAr: string };

export function listSeerahPlaces(db: SqlExecutor): SeerahPlace[] {
  return db
    .all<PlaceRow>(
      `SELECT p.id, p.slug, parent.slug AS parentSlug, p.kind, p.name_ar AS nameAr
       FROM seerah_places p ${installed('p')}
       LEFT JOIN seerah_places parent ON parent.resource_id = p.resource_id AND parent.id = p.parent_id
       ORDER BY p.id`,
    )
    .map((row) => ({
      id: row.slug,
      parentId: row.parentSlug,
      kind: row.kind as SeerahPlaceKind,
      nameAr: row.nameAr,
      nameEn: null,
    }));
}

function slugById(db: SqlExecutor): Map<number, string> {
  return new Map(
    db.all<{ id: number; slug: string }>(`SELECT p.id, p.slug FROM seerah_places p ${installed('p')}`).map((row) => [row.id, row.slug]),
  );
}

/** The drawn maps with their pin positions and route paths. */
export function listSeerahMapLevels(db: SqlExecutor): SeerahMapLevel[] {
  const slugs = slugById(db);
  const routeSlugs = new Map(
    db.all<{ id: number; slug: string; kind: string }>(`SELECT x.id, x.slug, x.kind FROM seerah_routes x ${installed('x')}`).map((row) => [row.id, row]),
  );
  const regionName =
    db.get<{ nameAr: string }>(
      `SELECT p.name_ar AS nameAr FROM seerah_map_levels l ${installed('l')}
       JOIN seerah_places p ON p.resource_id = l.resource_id AND p.id = l.parent_place_id
       WHERE l.level = 'region' LIMIT 1`,
    )?.nameAr ?? null;
  const levels = db.all<{ level: string; parentPlaceId: number; viewbox: string }>(
    `SELECT l.level, l.parent_place_id AS parentPlaceId, l.viewbox FROM seerah_map_levels l ${installed('l')}
     ORDER BY CASE l.level WHEN 'region' THEN 0 ELSE 1 END, l.level`,
  );
  return levels.map((level) => {
    const positions = db
      .all<{ placeId: number; x: number; y: number; labelPriority: number; labelSide: string }>(
        `SELECT m.place_id AS placeId, m.x, m.y, m.label_priority AS labelPriority, m.label_side AS labelSide
         FROM seerah_map_positions m ${installed('m')} WHERE m.level = ? ORDER BY m.rowid`,
        [level.level],
      )
      .flatMap((row) => {
        const placeId = slugs.get(row.placeId);
        return placeId === undefined
          ? []
          : [{ placeId, x: row.x, y: row.y, labelPriority: row.labelPriority, labelSide: row.labelSide as SeerahLabelSide }];
      });
    const routePaths = db
      .all<{ routeId: number; d: string }>(
        `SELECT m.route_id AS routeId, m.path_d AS d FROM seerah_map_route_paths m ${installed('m')} WHERE m.level = ? ORDER BY m.rowid`,
        [level.level],
      )
      .flatMap((row) => {
        const route = routeSlugs.get(row.routeId);
        return route === undefined ? [] : [{ routeId: route.slug, kind: route.kind as SeerahRouteKind, d: row.d }];
      });
    const parts = level.viewbox.trim().split(/\s+/).map(Number);
    return {
      id: level.level,
      parentPlaceId: slugs.get(level.parentPlaceId) ?? null,
      viewbox: [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 0],
      zoom: zoomForLevel(level.level),
      positions,
      routePaths,
      areaLabels: areaLabelsFor(level.level, regionName),
    };
  });
}

export function listSeerahRoutes(db: SqlExecutor): SeerahRoute[] {
  const slugs = slugById(db);
  const eventsByRoute = new Map<number, string[]>();
  for (const row of db.all<{ routeId: number; slug: string }>(
    `SELECT e.route_id AS routeId, e.slug FROM seerah_events e ${installed('e')} WHERE e.route_id IS NOT NULL ORDER BY e.position`,
  )) {
    eventsByRoute.set(row.routeId, [...(eventsByRoute.get(row.routeId) ?? []), row.slug]);
  }
  return db
    .all<{ id: number; slug: string; kind: string; nameAr: string }>(
      `SELECT x.id, x.slug, x.kind, x.name_ar AS nameAr FROM seerah_routes x ${installed('x')} ORDER BY x.id`,
    )
    .map((row) => ({
      id: row.slug,
      kind: row.kind as SeerahRouteKind,
      nameAr: row.nameAr,
      stops: db
        .all<{ placeId: number }>(
          `SELECT s.place_id AS placeId FROM seerah_route_stops s ${installed('s')} WHERE s.route_id = ? ORDER BY s.position`,
          [row.id],
        )
        .flatMap((stop) => {
          const slug = slugs.get(stop.placeId);
          return slug === undefined ? [] : [slug];
        }),
      eventIds: eventsByRoute.get(row.id) ?? [],
    }));
}

type EventRow = {
  slug: string;
  position: number;
  sectionCode: string;
  titleAr: string;
  kind: string;
  placeSlug: string | null;
  placeBasis: string | null;
  also: string;
  ageFrom: number | null;
  ageTo: number | null;
  era: string | null;
  hijriFrom: number | null;
  hijriTo: number | null;
  yearBasis: string | null;
  certainty: string | null;
  routeSlug: string | null;
  flags: string;
  paragraphFrom: number | null;
  paragraphTo: number | null;
};

const EVENT_SELECT = `
  SELECT e.slug, e.position, s.code AS sectionCode, e.title_ar AS titleAr, e.kind, p.slug AS placeSlug,
         e.place_basis AS placeBasis, e.also, e.age_from AS ageFrom, e.age_to AS ageTo, e.era,
         e.hijri_from AS hijriFrom, e.hijri_to AS hijriTo, e.year_basis AS yearBasis, e.certainty,
         x.slug AS routeSlug, e.flags, e.paragraph_from AS paragraphFrom, e.paragraph_to AS paragraphTo
  FROM seerah_events e
  JOIN installed_resources r ON r.resource_id = e.resource_id AND r."group" = 'seerah'
  LEFT JOIN seerah_sections s ON s.resource_id = e.resource_id AND s.id = e.section_id
  LEFT JOIN seerah_places p ON p.resource_id = e.resource_id AND p.id = e.place_id
  LEFT JOIN seerah_routes x ON x.resource_id = e.resource_id AND x.id = e.route_id
`;

function toEvent(row: EventRow, slugs: Map<number, string>): SeerahEvent {
  const flags = parseJson<{ code: string }[]>(row.flags, []).map((flag) => flag.code);
  const also = parseJson<number[]>(row.also, []).flatMap((id) => {
    const slug = slugs.get(id);
    return slug === undefined ? [] : [slug];
  });
  return {
    id: row.slug,
    sectionId: row.sectionCode,
    titleAr: row.titleAr,
    kind: row.kind as SeerahEventKind,
    placeId: row.placeSlug ?? 'other',
    placeBasis: (row.placeBasis ?? 'unstated') as SeerahPlaceBasis,
    alsoPlaceIds: also,
    ageFrom: row.ageFrom,
    ageTo: row.ageTo,
    era: row.era as SeerahEra | null,
    hijriFrom: row.hijriFrom,
    hijriTo: row.hijriTo,
    yearBasis: (row.yearBasis ?? 'unspecified') as SeerahYearBasis,
    certainty: (row.certainty ?? 'unspecified') as SeerahCertainty,
    position: row.position,
    routeId: row.routeSlug,
    flags,
  };
}

function readEvents(db: SqlExecutor, where: string, params: (string | number)[]): SeerahEvent[] {
  const slugs = slugById(db);
  return db.all<EventRow>(`${EVENT_SELECT} ${where}`, params).map((row) => toEvent(row, slugs));
}

/** Every event, in book order. */
export function listSeerahEvents(db: SqlExecutor): SeerahEvent[] {
  return readEvents(db, 'ORDER BY e.position', []);
}

export function getSeerahEvent(db: SqlExecutor, id: string): SeerahEvent | undefined {
  return readEvents(db, 'WHERE e.slug = ? LIMIT 1', [id])[0];
}

/** The events whose age range covers `age`, or the «غير محدد» bucket for `'unspecified'`, in book order. */
export function listEventsOfAge(db: SqlExecutor, age: number | 'unspecified'): SeerahEvent[] {
  return age === 'unspecified'
    ? readEvents(db, 'WHERE e.age_from IS NULL ORDER BY e.position', [])
    : readEvents(db, 'WHERE e.age_from IS NOT NULL AND e.age_from <= ? AND COALESCE(e.age_to, e.age_from) >= ? ORDER BY e.position', [age, age]);
}

/** The events at a place and at every place under it (recursive over the place tree), in book order. */
export function listEventsOfPlaceSubtree(db: SqlExecutor, placeId: string): SeerahEvent[] {
  return readEvents(
    db,
    `WHERE e.place_id IN (
       WITH RECURSIVE sub(id) AS (
         SELECT p0.id FROM seerah_places p0 JOIN installed_resources r0 ON r0.resource_id = p0.resource_id AND r0."group" = 'seerah' WHERE p0.slug = ?
         UNION
         SELECT c.id FROM seerah_places c JOIN sub ON c.parent_id = sub.id JOIN installed_resources r1 ON r1.resource_id = c.resource_id AND r1."group" = 'seerah'
       ) SELECT id FROM sub
     ) ORDER BY e.position`,
    [placeId],
  );
}

/** The events either side of this one in book order: the page's previous and next, with its place in the book. */
export function getSeerahEventNeighbours(
  db: SqlExecutor,
  id: string,
): { previous: SeerahEvent | null; next: SeerahEvent | null; index: number; total: number } | undefined {
  const current = db.get<{ position: number }>(
    `SELECT e.position FROM seerah_events e ${installed('e')} WHERE e.slug = ? LIMIT 1`,
    [id],
  );
  if (current === undefined) {
    return undefined;
  }
  const total = db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM seerah_events e ${installed('e')}`)?.n ?? 0;
  const index = db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM seerah_events e ${installed('e')} WHERE e.position <= ?`, [current.position])?.n ?? 0;
  return {
    previous: readEvents(db, 'WHERE e.position < ? ORDER BY e.position DESC LIMIT 1', [current.position])[0] ?? null,
    next: readEvents(db, 'WHERE e.position > ? ORDER BY e.position LIMIT 1', [current.position])[0] ?? null,
    index,
    total,
  };
}

/** The book's text for an event: the paragraphs of its span (its whole section when the span is the section). */
export function getSeerahEventText(db: SqlExecutor, id: string): SeerahEventText {
  const row = db.get<{ from: number | null; to: number | null }>(
    `SELECT e.paragraph_from AS "from", e.paragraph_to AS "to" FROM seerah_events e ${installed('e')} WHERE e.slug = ? LIMIT 1`,
    [id],
  );
  if (row === undefined || row.from === null || row.to === null) {
    return { paragraphs: [], sourcePage: null };
  }
  const paragraphs = listParagraphsOfSpan(db, row.from, row.to);
  return { paragraphs, sourcePage: paragraphs[0]?.page ?? null };
}

/** The quotes the place and the year of an event rest on (the evidence). */
export function listSeerahEvidence(db: SqlExecutor, id: string): SeerahEvidence[] {
  return db
    .all<{ kind: string; position: number; paragraphId: number; quoteAr: string }>(
      `SELECT v.kind, v.position, v.paragraph_id AS paragraphId, v.quote_ar AS quoteAr
       FROM seerah_event_evidence v ${installed('v')}
       JOIN seerah_events e ON e.resource_id = v.resource_id AND e.id = v.event_id
       WHERE e.slug = ? ORDER BY v.kind, v.position`,
      [id],
    )
    .map((row) => ({ kind: row.kind as 'place' | 'year', position: row.position, paragraphId: paragraphCode(row.paragraphId), quoteAr: row.quoteAr }));
}

export function listSeerahMilestones(db: SqlExecutor): SeerahMilestone[] {
  return db
    .all<{ key: string; labelAr: string; eventSlug: string }>(
      `SELECT m.milestone_key AS key, m.label_ar AS labelAr, e.slug AS eventSlug
       FROM seerah_milestones m ${installed('m')}
       JOIN seerah_events e ON e.resource_id = m.resource_id AND e.id = m.event_id
       ORDER BY m.position`,
    )
    .map((row) => ({ key: milestoneKey(row.key), labelAr: row.labelAr, eventId: row.eventSlug }));
}
