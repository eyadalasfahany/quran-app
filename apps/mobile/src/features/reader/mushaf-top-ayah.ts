// The ayah at the top of the Mushaf viewport (ADR 0073). Pure: HafsMushafList measures each paragraph and its screen
// position, and this module decides which ayah the reader is at. Nothing here changes the Quran text.

import type { VerseRecord } from './data/verses';
import { verseKeyAtOffset } from './mushaf-paragraph';
import type { TextLine } from './word-follow';

/** A surah paragraph on screen: its ayahs, its laid-out lines, and the screen top of its text (y 0 is the viewport top). */
export type MeasuredRun = { run: readonly VerseRecord[]; lines: readonly TextLine[]; screenTop: number };

/**
 * The ayah holding the first line at least half visible below the viewport's top edge (y 0). Null when none is
 * measured. A line that starts with the end mark of the ayah before it belongs to the next ayah.
 */
export function topVisibleVerseKey(runs: readonly MeasuredRun[]): string | null {
  const ordered = [...runs].sort((first, second) => first.screenTop - second.screenTop);
  for (const measured of ordered) {
    let offset = 0;
    for (const line of measured.lines) {
      if (measured.screenTop + line.y + line.height / 2 >= 0) {
        return verseKeyAtOffset(measured.run, offset);
      }
      offset += line.text.length;
    }
  }
  return null;
}
