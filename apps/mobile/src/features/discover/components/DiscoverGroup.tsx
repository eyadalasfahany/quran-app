import { Children, Fragment, type ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Card, UiText, useContrastColors } from '@/shared/ui';

/** A group heading over a raised card of rows, with a hairline between rows. */
export function DiscoverGroup({ title, children, testID }: { title: string; children: ReactNode; testID?: string }) {
  const theme = useTheme();
  const colors = useContrastColors();
  const rows = Children.toArray(children);

  return (
    <View style={{ gap: theme.space[2] }} testID={testID}>
      <UiText accessibilityRole="header" style={{ marginHorizontal: theme.space[2] }} tone="muted" variant="caption" weight={600}>
        {title}
      </UiText>
      <Card padding={1} radius="lg" style={{ overflow: 'hidden', padding: 0 }}>
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 ? <View style={{ backgroundColor: colors.line, height: theme.stroke.hairline }} /> : null}
            {row}
          </Fragment>
        ))}
      </Card>
    </View>
  );
}
