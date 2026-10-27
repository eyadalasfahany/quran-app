import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { uiTextProps } from '@/shared/ui';
import { useContrastColors } from '@/shared/ui/useContrastColors';

export function PanelSection({ title, children, testID }: { title: string; children: ReactNode; testID?: string }) {
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <View style={{ gap: theme.space[2] }} testID={testID}>
      <Text {...uiTextProps('caption')} accessibilityRole="header" style={[theme.text.caption, { color: colors.inkMuted }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}
