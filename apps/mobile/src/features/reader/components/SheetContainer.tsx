import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { uiTextProps } from '@/shared/ui';

import type { PanelTab } from '../selection';
import { AyahPanelPlaceholder } from './AyahPanelPlaceholder';

export function SheetContainer({
  verseKey,
  tab,
  testID = 'sheet-container',
}: {
  verseKey: string;
  tab: PanelTab;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View
      accessibilityLabel={t('reader.sheet.label')}
      style={{ backgroundColor: theme.colors.surface, flex: 1, gap: theme.space[4], padding: theme.space[4] }}
      testID={testID}
    >
      <Text {...uiTextProps('headline')} accessibilityRole="header" style={[theme.text.headline, { color: theme.colors.ink }]}>
        {verseKey}
      </Text>
      <AyahPanelPlaceholder tab={tab} />
    </View>
  );
}
