import type { AzkarSegment } from '@/features/azkar/data/model';

const QURAN_OPEN = '﴿';
const QURAN_CLOSE = '﴾';

/**
 * The text a user shares for a Quranic dua: its verses wrapped in ﴿ ﴾, a blank line, then the localised source line
 * («سورة البقرة · ٢٥٥»). Verses are joined with one space and never trimmed. Nothing else is added.
 */
export function duaQuranShareText(verses: readonly string[], source: string): string {
  return `${QURAN_OPEN}${verses.join(' ')}${QURAN_CLOSE}\n\n${source}`;
}

/**
 * The text a user shares for a prophetic dua: the text, a blank line, then the attribution, the source credit and the
 * source link, one per line. A blank attribution is skipped. Nothing else is added.
 */
export function duaHadithShareText({
  hadeeth,
  attribution,
  credit,
  url,
}: {
  hadeeth: string;
  attribution: string;
  credit: string;
  url: string;
}): string {
  const lines = attribution.trim().length > 0 ? [attribution, credit, url] : [credit, url];
  return `${hadeeth}\n\n${lines.join('\n')}`;
}

/**
 * The text a user shares for their own dua: the body exactly as written, with nothing appended (no title, no app name,
 * no link). The user's text is never trimmed or altered.
 */
export function duaMineShareText(body: string): string {
  return body;
}

/**
 * The text a user shares for a Hisn dua (ADR 0091): its Arabic segments in order, each Quran segment wrapped in ﴿ ﴾,
 * joined with one space. No source line, no app name, no link. Text is never trimmed or altered.
 */
export function duaHisnShareText(
  items: readonly { segments: readonly AzkarSegment[] }[],
  resolveQuran: (segment: AzkarSegment) => readonly string[],
): string {
  const parts: string[] = [];
  for (const item of items) {
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
  return parts.join(' ');
}
