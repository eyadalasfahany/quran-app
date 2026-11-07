import type { TFunction } from 'i18next';

import type { Locale } from '@/core/i18n';
import { formatNumber } from '@/core/i18n';

import { formatHadithNumber } from './format';

type Titles = { titleAr: string | null; titleEn: string | null };

// A title that is null or empty counts as missing (ADR 0042 §4). Never a fallback from the other language.
function present(value: string | null): string | null {
  return value === null || value === '' ? null : value;
}

/** Arabic UI: titleAr, else «مجموعة {n}». English UI: titleEn, else "Collection {n}". n = number. */
export function collectionTitle(c: Titles & { number: number }, locale: Locale, t: TFunction): string {
  const title = locale === 'ar' ? present(c.titleAr) : present(c.titleEn);
  return title ?? t('hadith.untitled.collection', { n: formatNumber(c.number, locale) });
}

/** Arabic UI: titleAr, else «كتاب {n}». English UI: titleEn, else "Book {n}". n = formatHadithNumber(bookNumber). */
export function bookTitle(b: Titles & { bookNumber: string }, locale: Locale, t: TFunction): string {
  const title = locale === 'ar' ? present(b.titleAr) : present(b.titleEn);
  return title ?? t('hadith.untitled.book', { n: formatHadithNumber(b.bookNumber, locale) });
}

/** Both UI languages: titleAr (no English chapter title exists, D14), else «باب {n}» / "Chapter {n}" with n = chapterNumber. */
export function chapterTitle(c: { titleAr: string | null; chapterNumber: number }, locale: Locale, t: TFunction): string {
  return present(c.titleAr) ?? t('hadith.untitled.chapter', { n: formatNumber(c.chapterNumber, locale) });
}

/** A run of chapterless hadith: «حديث {n}» for one hadith, else «أحاديث {first}–{last}» (Arabic) or "Hadith {first}–{last}". */
export function runTitle(
  run: { firstNumber: string; lastNumber: string; count: number },
  locale: Locale,
  t: TFunction,
): string {
  if (run.count === 1) {
    return t('hadith.chapters.runSingle', { n: formatHadithNumber(run.firstNumber, locale) });
  }
  return t('hadith.chapters.run', {
    first: formatHadithNumber(run.firstNumber, locale),
    last: formatHadithNumber(run.lastNumber, locale),
  });
}

/** The cover's title: Arabic UI titleAr, English UI titleEn, else null (ornament-only cover). No fallback text. */
export function coverTitle(c: Titles, locale: Locale): string | null {
  return locale === 'ar' ? present(c.titleAr) : present(c.titleEn);
}

/** The author line: Arabic UI authorAr, English UI authorEn, else null (the line is hidden). */
export function collectionAuthor(c: { authorAr: string | null; authorEn: string | null }, locale: Locale): string | null {
  return locale === 'ar' ? present(c.authorAr) : present(c.authorEn);
}
