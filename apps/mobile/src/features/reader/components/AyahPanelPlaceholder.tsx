import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { uiTextProps } from '@/shared/ui';

import type { PanelTab } from '../selection';

export function AyahPanelPlaceholder({ tab, testID = 'ayah-panel-placeholder' }: { tab: PanelTab; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View testID={testID}>
      <Text {...uiTextProps('body')} style={[theme.text.body, { color: theme.colors.ink }]}>
        {t(`reader.panel.tabs.${tab}`)}
      </Text>
    </View>
  );
}
