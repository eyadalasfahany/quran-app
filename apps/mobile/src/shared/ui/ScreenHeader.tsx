import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';

import { UiText } from './UiText';

// The large title at the top of a screen, with an optional hint under it and a trailing control
// (a search button). Controls that belong to the header (a segment, a search field) go in children.
export function ScreenHeader({
  title,
  hint,
  trailing,
  children,
  testID,
}: {
  title?: string;
  hint?: string;
  trailing?: ReactNode;
  children?: ReactNode;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space[3], paddingBottom: theme.space[2], paddingTop: theme.space[4] }} testID={testID}>
      {title ? (
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[3] }}>
          <UiText accessibilityRole="header" style={{ flex: 1 }} variant="title">
            {title}
          </UiText>
          {trailing}
        </View>
      ) : null}
      {children}
      {hint ? (
        <UiText tone="muted" variant="caption">
          {hint}
        </UiText>
      ) : null}
    </View>
  );
}
