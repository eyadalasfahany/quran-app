import { normalizeForSearch } from '@/core/text/normalizeForSearch';

import type { ChapterRecord } from '@/features/reader/data/chapters';

export function matchSurahNames(chapters: ChapterRecord[], query: string): ChapterRecord[] {
  const normalizedQuery = stripArticle(normalizeForSearch(query.trim()));
  if (normalizedQuery.length === 0) {
    return [];
  }

  const lowerQuery = normalizedQuery.toLowerCase();

  return chapters.filter((chapter) => {
    const arabic = stripArticle(normalizeForSearch(chapter.nameArabic));
    const simple = stripArticle(normalizeForSearch(chapter.nameSimple)).toLowerCase();
    const english = chapter.nameEn.trim().toLowerCase();
    return (
      arabic.startsWith(normalizedQuery) ||
      simple.startsWith(lowerQuery) ||
      english.startsWith(lowerQuery)
    );
  });
}

function stripArticle(value: string): string {
  return value.startsWith('ال') ? value.slice(2) : value;
}
