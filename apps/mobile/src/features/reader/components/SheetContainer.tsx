import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { useTheme } from '@/core/theme';
import { SegmentedControl } from '@/shared/ui';

import { AyahPanelContent } from '../panels/AyahPanelContent';
import type { PanelTab } from '../selection';
import { SheetFrame } from './SheetFrame';

export function SheetContainer({
  verseKey,
  tab,
  onClose,
  executor,
  testID = 'sheet-container',
}: {
  verseKey: string;
  tab: PanelTab;
  onClose?: () => void;
  executor?: SqlExecutor | null;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [currentTab, setCurrentTab] = useState<PanelTab>(tab);
  const [currentKey, setCurrentKey] = useState(verseKey);
  const options = [
    { key: 'actions' as const, label: t('reader.panel.tabs.actions') },
    { key: 'tafsir' as const, label: t('reader.panel.tabs.tafsir') },
    { key: 'translation' as const, label: t('reader.panel.tabs.translation') },
  ];

  return (
    <SheetFrame>
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
        <SegmentedControl
          label={t('reader.panel.tabsLabel')}
          onChange={setCurrentTab}
          options={options}
          testID={`${testID}-tabs`}
          value={currentTab}
        />
        <AyahPanelContent
          executor={executor}
          onClose={onClose}
          onTabChange={setCurrentTab}
          onVerseChange={setCurrentKey}
          tab={currentTab}
          testID={`${testID}-content`}
          verseKey={currentKey}
        />
      </View>
    </SheetFrame>
  );
}
