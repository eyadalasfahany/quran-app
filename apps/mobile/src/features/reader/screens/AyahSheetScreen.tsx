import { useCallback, useEffect, useRef } from 'react';

import type { SvgMushafKey } from '@/core/mushaf-pack';

import { SheetContainer } from '../components/SheetContainer';
import { SheetHost } from '../components/SheetHost';
import { useReaderSelection, type PanelTab } from '../selection';

// The ayah sheet on compact and medium windows (the /ayah and /tafsir routes). It opens at the mid
// detent, and the sheet's own close slides it away. While it is open, the ayah it shows is the pressed one.
export function AyahSheetScreen({
  verseKey,
  initialTab,
  riwayah = 'hafs',
}: {
  verseKey: string;
  initialTab: PanelTab;
  riwayah?: SvgMushafKey;
}) {
  const shown = useRef(verseKey);

  const onVerseChange = useCallback((next: string) => {
    shown.current = next;
    useReaderSelection.getState().setSheetVerseKey(next);
  }, []);

  useEffect(() => {
    useReaderSelection.getState().setSheetVerseKey(shown.current);
    return () => {
      // A sheet opened after this one may already own the key; only clear our own.
      const state = useReaderSelection.getState();
      if (state.sheetVerseKey === shown.current) {
        state.setSheetVerseKey(null);
      }
    };
  }, []);

  return (
    <SheetHost>
      <SheetContainer onVerseChange={onVerseChange} riwayah={riwayah} tab={initialTab} verseKey={verseKey} />
    </SheetHost>
  );
}
