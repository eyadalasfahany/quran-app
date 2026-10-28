import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { GlassSurface, IconButton } from '@/shared/ui';

import type { PanelTab } from '../selection';
import { PanelTabs } from './PanelTabs';

const CLOSE = { ios: 'xmark', android: 'close' } as const;

export function SidePanel({
  tab,
  onTabChange,
  onClose,
  children,
  testID = 'reader-side-panel',
}: {
  tab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  onClose: () => void;
  children?: ReactNode;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <GlassSurface
      accessibilityLabel={t('reader.panel.label')}
      accessibilityRole="summary"
      radius="xl"
      style={{ height: '100%', padding: theme.space[4] }}
      testID={testID}
    >
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[2], marginBottom: theme.space[3] }}>
        <View style={{ flex: 1 }} />
        <IconButton
          icon={CLOSE}
          label={t('reader.panel.close')}
          onPress={onClose}
          testID="reader-panel-close"
          variant="surface"
        />
      </View>
      <PanelTabs onChange={onTabChange} testID="reader-panel-tabs" value={tab} />
      <View style={{ flex: 1, paddingTop: theme.space[4] }}>{children}</View>
    </GlassSurface>
  );
}
