import { SheetContainer } from '../components/SheetContainer';
import { SheetHost } from '../components/SheetHost';
import type { PanelTab } from '../selection';

// The ayah sheet on compact and medium windows (the /ayah and /tafsir routes). It opens at the mid
// detent, and the sheet's own close slides it away.
export function AyahSheetScreen({ verseKey, initialTab }: { verseKey: string; initialTab: PanelTab }) {
  return (
    <SheetHost>
      <SheetContainer tab={initialTab} verseKey={verseKey} />
    </SheetHost>
  );
}
