import { Stack } from 'expo-router';

import { MainShell, useWindowClass } from '@/core/layout';
import { useTheme } from '@/core/theme';

/**
 * The Salah screens sit outside the tabs (ADR 0032). On an expanded window they keep the sidebar, with الصلاة selected
 * (ADR 0032 amendment). Phones keep the pushed screen with its back button.
 */
export default function SalahLayout() {
  const theme = useTheme();
  const expanded = useWindowClass() === 'expanded';
  const stack = (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.surface } }} />
  );

  if (!expanded) {
    return stack;
  }
  return (
    <MainShell active="(salah)" expanded>
      {stack}
    </MainShell>
  );
}
