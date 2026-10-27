import { router, useSegments } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Sidebar } from '@/shared/ui';

import { destinations } from './destinations';

export function MainShell({ expanded, children }: { expanded: boolean; children: ReactNode }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const segments: readonly string[] = useSegments();
  const active = destinations.find((item) => segments.includes(item.name))?.name ?? '(home)';

  return (
    <View style={{ backgroundColor: theme.colors.surface, flex: 1, flexDirection: 'row' }} testID="main-shell">
      {expanded ? (
        <Sidebar
          items={destinations.map((item) => ({
            androidIcon: item.androidIcon,
            key: item.name,
            label: t(item.label),
            onPress: () => router.navigate(item.href),
            selected: item.name === active,
            symbol: item.symbol,
            testID: `sidebar-${item.testID}`,
          }))}
          label={t('nav.main')}
        />
      ) : null}
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}
