import { router } from 'expo-router';
import { useState } from 'react';

import { SheetContainer } from '../components/SheetContainer';
import { SheetHost } from '../components/SheetHost';
import { sheetTopFor } from '../form-sheet';
import type { PanelTab } from '../selection';

// The ayah sheet on compact and medium windows (the /ayah and /tafsir routes). Its height follows the tab:
// the actions card leaves the page visible, and tafsir takes the tall sheet.
export function AyahSheetScreen({ verseKey, initialTab }: { verseKey: string; initialTab: PanelTab }) {
  const [tab, setTab] = useState<PanelTab>(initialTab);

  return (
    <SheetHost topGap={sheetTopFor(tab)}>
      <SheetContainer onClose={() => router.back()} onTabChange={setTab} tab={tab} verseKey={verseKey} />
    </SheetHost>
  );
}
