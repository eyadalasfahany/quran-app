import { isSvgMushafKey, type SvgMushafKey } from '@/core/mushaf-pack';

import { useReaderSettings } from '../settings';

/** The mushaf the reader chose (ADR 0090 decision 2). Read-only here; the picker writes it. */
export function useChosenMushafKey(): SvgMushafKey {
  const mushaf = useReaderSettings((state) => state.mushaf);
  return isSvgMushafKey(mushaf) ? mushaf : 'hafs';
}
