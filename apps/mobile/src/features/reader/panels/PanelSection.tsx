import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

export function PanelSection({ title, children, testID }: { title: string; children: ReactNode; testID?: string }) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space[2] }} testID={testID}>
      <UiText accessibilityRole="header" tone="muted" variant="caption">
        {title}
      </UiText>
      {children}
    </View>
  );
}
