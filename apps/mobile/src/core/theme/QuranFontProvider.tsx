import { createContext, use, type ReactNode } from 'react';

import { DEFAULT_QURAN_FONT, type QuranFont } from './fonts';

const QuranFontContext = createContext<QuranFont>(DEFAULT_QURAN_FONT);

// The reader's chosen Quran font (ADR 0048), provided at the root from the reader settings, so every Quran string
// follows it without the shared UI reading a feature store.
export function QuranFontProvider({ font, children }: { font: QuranFont; children: ReactNode }) {
  return <QuranFontContext value={font}>{children}</QuranFontContext>;
}

export function useQuranFont(): QuranFont {
  return use(QuranFontContext);
}
