import { NativeTabs } from 'expo-router/native-tabs';
import { TabList, Tabs, TabSlot, TabTrigger } from 'expo-router/ui';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

import { FloatingTab } from '@/core/layout/FloatingTab';
import {
  tabDestinations,
  MainShell,
  tabBarMode,
  useIsShortWindow,
  useTabBarHiddenOnScroll,
  useTabBarStyle,
} from '@/core/layout';
import { FloatingTabBar } from '@/shared/ui';

export const unstable_settings = {
  anchor: '(home)',
};

/**
 * The five tabs. A tall window keeps the native tabs on iOS and the floating bar on Android (ADR 0033), on every width,
 * tablets included (ADR 0051). A short window (a landscape phone) shows the same destinations as a vertical rail on both
 * platforms (ADR 0036; developer, 1 Nov 2026). The headless navigator is the one the rail and the Android bar use, so the
 * route, the open tab and its stack carry over when the window turns short or tall. Only the native-versus-headless choice
 * depends on the platform, and only in tall windows.
 */
export default function MainLayout() {
  const { t } = useTranslation();
  const tabBar = useTabBarStyle();
  const short = useIsShortWindow();
  const headless = tabBarMode(Platform.OS, short) === 'headless';
  const tabBarScrollHidden = useTabBarHiddenOnScroll();

  return (
    <MainShell>
      {headless ? (
        // The floating bar on Android, the vertical rail in a short window on either platform (ADR 0033, ADR 0036).
        <Tabs>
          <TabSlot />
          <TabList asChild>
            <FloatingTabBar label={t('nav.main')}>
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
        <NativeTabs {...tabBar} hidden={tabBarScrollHidden}>
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
