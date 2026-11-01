import { NativeTabs } from 'expo-router/native-tabs';
import { TabList, Tabs, TabSlot, TabTrigger } from 'expo-router/ui';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

import { FloatingTab } from '@/core/layout/FloatingTab';
import { tabDestinations, MainShell, useTabBarStyle, useWindowClass } from '@/core/layout';
import { FloatingTabBar } from '@/shared/ui';

export const unstable_settings = {
  anchor: '(home)',
};

export default function MainLayout() {
  const { t } = useTranslation();
  const tabBar = useTabBarStyle();
  const expanded = useWindowClass() === 'expanded';

  return (
    <MainShell expanded={expanded}>
      {Platform.OS === 'android' ? (
        // Android draws its own floating bar from the same destinations (ADR 0033). iOS keeps the native tabs below.
        <Tabs>
          <TabSlot />
          <TabList asChild>
            <FloatingTabBar hidden={expanded} label={t('nav.main')}>
              {tabDestinations.map((item) => (
                <TabTrigger asChild key={item.name} name={item.name} href={item.href}>
                  <FloatingTab
                    icon={{ ios: item.symbol, android: item.androidIcon }}
                    label={t(item.label)}
                    testID={item.testID}
                  />
                </TabTrigger>
              ))}
              {/* الصلاة has no tab item (ADR 0032), but its route stays registered: the menu opens it. It renders nothing. */}
              <TabTrigger asChild name="(salah)" href="/(main)/(salah)" />
            </FloatingTabBar>
          </TabList>
        </Tabs>
      ) : (
        <NativeTabs {...tabBar} hidden={expanded}>
          {tabDestinations.map((item) => (
            <NativeTabs.Trigger key={item.name} name={item.name}>
              <NativeTabs.Trigger.Label>{t(item.label)}</NativeTabs.Trigger.Label>
              <NativeTabs.Trigger.Icon md={item.androidIcon} sf={item.symbol} />
            </NativeTabs.Trigger>
          ))}
          {/* الصلاة has no tab item (ADR 0032), but its route stays registered: the menu opens it. */}
          <NativeTabs.Trigger hidden name="(salah)" />
        </NativeTabs>
      )}
    </MainShell>
  );
}
