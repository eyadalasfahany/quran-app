import type { SqlExecutor } from '@/core/db/sql-executor';
import type { Locale } from '@/core/i18n/locale';

export type RevelationPlace = 'makkah' | 'madinah';

export type ChapterRecord = {
  id: number;
  nameArabic: string;
  nameSimple: string;
  nameEn: string;
  revelationPlace: RevelationPlace;
  revelationOrder: number;
  versesCount: number;
  bismillahPre: number;
  bismillahText: string | null;
  bismillahImlaei: string | null;
  pageStart: number;
  pageEnd: number;
};

type ChapterRow = Omit<ChapterRecord, 'revelationPlace'> & { revelationPlace: string };

const CHAPTER_SELECT = `
  SELECT
    id,
    name_arabic AS nameArabic,
    name_simple AS nameSimple,
    name_en AS nameEn,
    revelation_place AS revelationPlace,
    revelation_order AS revelationOrder,
    verses_count AS versesCount,
    bismillah_pre AS bismillahPre,
    bismillah_text AS bismillahText,
    bismillah_imlaei AS bismillahImlaei,
    page_start AS pageStart,
    page_end AS pageEnd
  FROM chapters
`;

/** The surah name the interface shows: Arabic in Arabic, the transliteration ("Al-Baqarah") in English (ADR 0045). */
export function chapterDisplayName(chapter: Pick<ChapterRecord, 'nameArabic' | 'nameSimple'>, locale: Locale): string {
  return locale === 'ar' ? chapter.nameArabic : chapter.nameSimple;
}

export function listChapters(db: SqlExecutor): ChapterRecord[] {
  return db.all<ChapterRow>(`${CHAPTER_SELECT} ORDER BY id`).map(asChapter);
}

export function getChapter(db: SqlExecutor, id: number): ChapterRecord | undefined {
  const row = db.get<ChapterRow>(`${CHAPTER_SELECT} WHERE id = ?`, [id]);
  return row === undefined ? undefined : asChapter(row);
}

function asChapter(row: ChapterRow): ChapterRecord {
  if (!isRevelationPlace(row.revelationPlace)) {
    throw new Error(`Unknown revelation place for chapter ${row.id}.`);
  }

  return { ...row, revelationPlace: row.revelationPlace };
}

function isRevelationPlace(value: string): value is RevelationPlace {
  return value === 'makkah' || value === 'madinah';
}
