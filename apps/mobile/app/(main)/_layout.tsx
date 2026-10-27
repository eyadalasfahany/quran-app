import { NativeTabs } from 'expo-router/native-tabs';
import { router, useSegments } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { destinations, useWindowClass } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { Sidebar } from '@/shared/ui';

export const unstable_settings = {
  anchor: '(home)',
};

export default function MainLayout() {
  const { t } = useTranslation();
  const theme = useTheme();
  const expanded = useWindowClass() === 'expanded';
  const segments: readonly string[] = useSegments();
  const active = destinations.find((item) => segments.includes(item.name))?.name ?? '(home)';

  return (
    <View style={{ backgroundColor: theme.colors.surface, flex: 1, flexDirection: 'row' }}>
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
      <View style={{ flex: 1 }}>
        <NativeTabs
          backgroundColor={theme.colors.glassFallback}
          hidden={expanded}
          iconColor={{ default: theme.colors.inkMuted, selected: theme.colors.brand }}
          labelStyle={{
            default: {
              color: theme.colors.inkMuted,
              fontFamily: theme.text.label.fontFamily,
              fontSize: theme.text.label.fontSize,
            },
            selected: {
              color: theme.colors.brand,
              fontFamily: theme.text.headline.fontFamily,
              fontSize: theme.text.label.fontSize,
            },
          }}
          tintColor={theme.colors.brand}
        >
          {destinations.map((item) => (
            <NativeTabs.Trigger key={item.name} name={item.name}>
              <NativeTabs.Trigger.Label>{t(item.label)}</NativeTabs.Trigger.Label>
              <NativeTabs.Trigger.Icon md={item.androidIcon} sf={item.symbol} />
            </NativeTabs.Trigger>
          ))}
        </NativeTabs>
      </View>
    </View>
  );
}
