import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { SqlExecutor } from '@/core/db/sql-executor';
import type { SvgMushafKey } from '@/core/mushaf-pack';
import { useTheme } from '@/core/theme';

import { publishKhatmaMarkedNotice } from '@/features/khatma/marked-notice';

import { AyahPanelContent } from '../panels/AyahPanelContent';
import type { PanelTab } from '../selection';
import { sheetShapeFor } from '../form-sheet';
import { PanelTabs } from './PanelTabs';
import { SheetFrame } from './SheetFrame';
import { useSheet } from './sheet-context';

export function SheetContainer({
  verseKey,
  tab,
  onClose,
  onTabChange,
  onVerseChange,
  executor,
  riwayah = 'hafs',
  testID = 'sheet-container',
}: {
  verseKey: string;
  tab: PanelTab;
  onClose?: () => void;
  /** Reports the tab the reader switched to, so the sheet around it can resize. */
  onTabChange?: (tab: PanelTab) => void;
  /** Reports the ayah the reader moved to inside the sheet (next or previous). */
  onVerseChange?: (verseKey: string) => void;
  executor?: SqlExecutor | null;
  /** The riwayah of the tapped page; not Hafs shows only a note (RiwayahAyahUnavailable), without tabs. */
  riwayah?: SvgMushafKey;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const sheet = useSheet();
  const [currentTab, setCurrentTab] = useState<PanelTab>(tab);
  const [currentKey, setCurrentKey] = useState(verseKey);
  const changeVerse = (next: string) => {
    setCurrentKey(next);
    onVerseChange?.(next);
  };
  const changeTab = (next: PanelTab) => {
    // The tafsir reads at full height, so switching to it lifts the sheet.
    if (next === 'tafsir') {
      sheet?.expand();
    }
    setCurrentTab(next);
    onTabChange?.(next);
  };

  return (
    <SheetFrame grabber={currentTab === 'tafsir' ? 'compact' : 'strong'} shape={sheetShapeFor(currentTab)}>
      <View
        accessibilityLabel={t('reader.sheet.label')}
        style={{
          flex: 1,
          gap: theme.space[4],
          padding: theme.space[4],
          paddingTop: theme.space[5],
        }}
        testID={testID}
      >
        {riwayah === 'hafs' ? <PanelTabs onChange={changeTab} testID={`${testID}-tabs`} value={currentTab} /> : null}
        <AyahPanelContent
          executor={executor}
          layout="sheet"
          onClose={onClose ?? sheet?.close ?? (() => router.back())}
          onKhatmaMarked={publishKhatmaMarkedNotice}
          onTabChange={changeTab}
          onVerseChange={changeVerse}
          riwayah={riwayah}
          tab={currentTab}
          testID={`${testID}-content`}
          verseKey={currentKey}
        />
      </View>
    </SheetFrame>
  );
}
