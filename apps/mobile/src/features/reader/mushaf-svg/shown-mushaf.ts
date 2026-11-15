// Which mushaf the reader shows (ADR 0090 decision 12). Pure. The chosen mushaf is kept as it is; only the shown one changes.
import type { SvgMushafKey } from '@/core/mushaf-pack';

export function shownMushafKey(input: {
  chosen: SvgMushafKey;
  playing: boolean;
  /** The riwayah of the reciter being followed, or null when it is not known (every reciter is Hafs until step 9b). */
  reciterRiwayah: SvgMushafKey | null;
}): SvgMushafKey {
  if (!input.playing) {
    return input.chosen;
  }
  return input.reciterRiwayah ?? 'hafs';
}
