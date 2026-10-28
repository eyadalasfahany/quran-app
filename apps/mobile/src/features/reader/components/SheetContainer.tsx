import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { useTheme } from '@/core/theme';

import { AyahPanelContent } from '../panels/AyahPanelContent';
import type { PanelTab } from '../selection';
import { sheetShapeFor } from '../form-sheet';
import { PanelTabs } from './PanelTabs';
import { SheetFrame } from './SheetFrame';

export function SheetContainer({
  verseKey,
  tab,
  onClose,
  onTabChange,
  executor,
  testID = 'sheet-container',
}: {
  verseKey: string;
  tab: PanelTab;
  onClose?: () => void;
  /** Reports the tab the reader switched to, so the sheet around it can resize. */
  onTabChange?: (tab: PanelTab) => void;
  executor?: SqlExecutor | null;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [currentTab, setCurrentTab] = useState<PanelTab>(tab);
  const [currentKey, setCurrentKey] = useState(verseKey);
  const changeTab = (next: PanelTab) => {
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
        <PanelTabs onChange={changeTab} testID={`${testID}-tabs`} value={currentTab} />
        <AyahPanelContent
          executor={executor}
          layout="sheet"
          onClose={onClose}
          onTabChange={changeTab}
          onVerseChange={setCurrentKey}
          tab={currentTab}
          testID={`${testID}-content`}
          verseKey={currentKey}
        />
      </View>
    </SheetFrame>
  );
}
