import { NativeTabs } from 'expo-router/native-tabs';
import { useTranslation } from 'react-i18next';

import { destinations, MainShell, useTabBarStyle, useWindowClass } from '@/core/layout';

export const unstable_settings = {
  anchor: '(home)',
};

export default function MainLayout() {
  const { t } = useTranslation();
  const tabBar = useTabBarStyle();
  const expanded = useWindowClass() === 'expanded';

  return (
    <MainShell expanded={expanded}>
      <NativeTabs {...tabBar} hidden={expanded}>
        {destinations.map((item) => (
          <NativeTabs.Trigger key={item.name} name={item.name}>
            <NativeTabs.Trigger.Label>{t(item.label)}</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon md={item.androidIcon} sf={item.symbol} />
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
    </MainShell>
  );
}
