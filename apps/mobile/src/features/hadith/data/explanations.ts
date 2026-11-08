import type { SqlExecutor } from '@/core/db/sql-executor';
import type { Locale } from '@/core/i18n';

import type { HadithExplanationView } from '../components/HadithExplanationCard';

/** Explanations of hadith (ADR 0078). Text is read as stored: no trim, no substr, no normalisation. */

type ExplanationRow = {
  body: string | null;
  benefits: string | null;
  words: string | null;
  intro: string | null;
  name: string | null;
  nameAr: string | null;
};

type WordMeaning = { word: string; meaning: string };

function parseJson(raw: string | null): unknown {
  if (raw === null) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isWordMeaning(item: unknown): item is WordMeaning {
  if (typeof item !== 'object' || item === null) {
    return false;
  }
  const { word, meaning } = item as Record<string, unknown>;
  return typeof word === 'string' && typeof meaning === 'string';
}

// A field that is not the expected JSON shape reads as null; the rest of the row still shows.
function benefitsOf(raw: string | null): string[] | null {
  const value = parseJson(raw);
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : null;
}

function wordMeaningsOf(raw: string | null): WordMeaning[] | null {
  const value = parseJson(raw);
  return Array.isArray(value) ? value.filter(isWordMeaning) : null;
}

/**
 * The explanations of one hadith, one per linked source, in resource order then id order. A row with no body and no
 * benefits or word meanings is skipped (a placeholder). The source name is the catalogue name in the UI language.
 */
export function explanationsFor(
  db: SqlExecutor,
  slug: string,
  hadithNumber: string,
  locale: Locale,
): HadithExplanationView[] {
  const rows = db.all<ExplanationRow>(
    `SELECT e.body_ar AS body, e.benefits_ar AS benefits, e.words_ar AS words, e.intro_ar AS intro,
            cr.name AS name, cr.name_ar AS nameAr
     FROM hadith_explanation_links l
     JOIN hadith_explanations e ON e.resource_id = l.resource_id AND e.id = l.explanation_id
     JOIN installed_resources r ON r.resource_id = e.resource_id AND r."group" = 'hadith_explanations'
     LEFT JOIN catalog_resources cr ON cr.resource_id = e.resource_id
     WHERE l.collection_slug = ? AND l.hadith_number = ?
     ORDER BY e.resource_id, e.id`,
    [slug, hadithNumber],
  );

  const views: HadithExplanationView[] = [];
  for (const row of rows) {
    const benefits = benefitsOf(row.benefits);
    const wordMeanings = wordMeaningsOf(row.words);
    if (row.body === null && (benefits?.length ?? 0) === 0 && (wordMeanings?.length ?? 0) === 0) {
      continue;
    }
    views.push({
      sourceName: (locale === 'ar' ? row.nameAr : row.name) ?? '',
      explanation: row.body ?? '',
      benefits,
      wordMeanings,
      intro: row.intro,
    });
  }
  return views;
}

/** Catalogue ids of explanation resources that are not installed yet. Empty when no collection is installed. */
export function uninstalledExplanationResourceIds(db: SqlExecutor): number[] {
  return db
    .all<{ resourceId: number }>(
      `SELECT cr.resource_id AS resourceId
       FROM catalog_resources cr
       WHERE cr."group" = 'hadith_explanations'
         AND NOT EXISTS (SELECT 1 FROM installed_resources ir WHERE ir.resource_id = cr.resource_id)
       ORDER BY cr.resource_id`,
    )
    .map((row) => row.resourceId);
}
