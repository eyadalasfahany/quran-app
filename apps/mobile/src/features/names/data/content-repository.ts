import type { SqlExecutor } from '@/core/db/sql-executor';

import { activeNamesResourceId } from './active-resource';
import { hasNamesContent } from './availability';
import { isNameFavourite } from './favorites-repository';
import type { NameDetail, NameReference, NameSummary, NamesListMeta } from './model';

export { hasNamesContent };

export function getNamesList(db: SqlExecutor): NamesListMeta | null {
  const resourceId = activeNamesResourceId(db);
  const row = db.get<{
    listSlug: string;
    titleAr: string;
    sourceLabelAr: string;
    attributionAr: string | null;
    attributionEn: string | null;
    editionReference: string | null;
    sourceVersion: string;
  }>(
    `SELECT list_slug AS listSlug, title_ar AS titleAr, source_label_ar AS sourceLabelAr,
            attribution_ar AS attributionAr, attribution_en AS attributionEn,
            edition_reference AS editionReference, source_version AS sourceVersion
     FROM names_lists WHERE resource_id = ? LIMIT 1`,
    [resourceId],
  );
  return row ?? null;
}

export function listNames(db: SqlExecutor, userDb?: SqlExecutor): NameSummary[] {
  const resourceId = activeNamesResourceId(db);
  const rows = db.all<{ nameSlug: string; position: number; nameAr: string }>(
    `SELECT name_slug AS nameSlug, position, name_ar AS nameAr FROM names
     WHERE resource_id = ? ORDER BY position ASC`,
    [resourceId],
  );
  return rows.map((row) => ({
    nameSlug: row.nameSlug,
    position: row.position,
    nameAr: row.nameAr,
    isFavourite: userDb ? isNameFavourite(row.nameSlug, userDb) : false,
  }));
}

export function getNameBySlug(db: SqlExecutor, nameSlug: string, userDb?: SqlExecutor): NameDetail | null {
  const resourceId = activeNamesResourceId(db);
  const list = getNamesList(db);
  const row = db.get<{ nameSlug: string; position: number; nameAr: string }>(
    `SELECT name_slug AS nameSlug, position, name_ar AS nameAr FROM names
     WHERE resource_id = ? AND name_slug = ? LIMIT 1`,
    [resourceId, nameSlug],
  );
  if (!row || !list) {
    return null;
  }

  const references = listNameReferences(db, nameSlug);
  const note = db.get<{ textAr: string | null }>(
    `SELECT text_ar AS textAr FROM names_notes
     WHERE resource_id = ? AND name_slug = ? AND review_status = 'reviewed' LIMIT 1`,
    [resourceId, nameSlug],
  );

  return {
    nameSlug: row.nameSlug,
    position: row.position,
    nameAr: row.nameAr,
    isFavourite: userDb ? isNameFavourite(row.nameSlug, userDb) : false,
    list,
    references,
    sourceNote: note?.textAr ?? null,
  };
}

export function listNameReferences(db: SqlExecutor, nameSlug: string): NameReference[] {
  const resourceId = activeNamesResourceId(db);
  const rows = db.all<{ verseKey: string; textUthmani: string | null }>(
    `SELECT nv.verse_key AS verseKey, v.text_uthmani AS textUthmani
     FROM names_verses nv
     LEFT JOIN verses v ON v.verse_key = nv.verse_key
     WHERE nv.resource_id = ? AND nv.name_slug = ? AND nv.review_status = 'reviewed'
     ORDER BY nv.verse_key ASC`,
    [resourceId, nameSlug],
  );
  return rows.map((row) => ({ verseKey: row.verseKey, verseTextUthmani: row.textUthmani }));
}

export function neighbourSlugs(db: SqlExecutor, position: number): { previous: string | null; next: string | null } {
  const resourceId = activeNamesResourceId(db);
  const previous = db.get<{ nameSlug: string }>(
    `SELECT name_slug AS nameSlug FROM names WHERE resource_id = ? AND position = ? LIMIT 1`,
    [resourceId, position - 1],
  );
  const next = db.get<{ nameSlug: string }>(
    `SELECT name_slug AS nameSlug FROM names WHERE resource_id = ? AND position = ? LIMIT 1`,
    [resourceId, position + 1],
  );
  return { previous: previous?.nameSlug ?? null, next: next?.nameSlug ?? null };
}
