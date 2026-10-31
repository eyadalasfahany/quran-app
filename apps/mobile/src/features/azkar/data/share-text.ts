import type { ReaderUnit } from './reader-units';
import type { AzkarSegment } from './model';

const QURAN_OPEN = '﴿';
const QURAN_CLOSE = '﴾';

/** The verse texts (`text_uthmani`) of a `quran` segment, in order. Resolved from `verses`, never from azkar tables. */
export type QuranSegmentResolver = (segment: AzkarSegment) => readonly string[];

/**
 * The text a user shares for a unit: its Arabic segments in order, with each Quran segment wrapped in ﴿ ﴾,
 * then a blank line and the source line. Nothing else: no app name, link or emoji. Text is never trimmed or
 * altered; segments are joined with one space.
 *
 * `source` is the localised source line (for example «حصن المسلم · ١٢»), built by the caller.
 */
export function azkarShareText(unit: ReaderUnit, resolveQuran: QuranSegmentResolver, source: string): string {
  const parts: string[] = [];

  for (const item of [...unit.preface, ...unit.body, ...unit.afterword]) {
    for (const segment of item.segments) {
      if (segment.kind === 'quran') {
        const verses = resolveQuran(segment);
        if (verses.length > 0) {
          parts.push(`${QURAN_OPEN}${verses.join(' ')}${QURAN_CLOSE}`);
        }
      } else if (segment.textAr !== null) {
        parts.push(segment.textAr);
      }
    }
  }

  return `${parts.join(' ')}\n\n${source}`;
}
