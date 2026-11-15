import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

/** One row of the map key: a sample of the symbol (decorative, untouchable) and what it means. The row reads «title, hint». */
export function MapKeyRow({
  symbol,
  title,
  hint,
  testID,
}: {
  symbol: ReactNode;
  title: string;
  hint: string;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View
      accessibilityLabel={`${title}، ${hint}`}
      accessible
      style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[3], minHeight: theme.size.touchTarget + theme.space[2], paddingHorizontal: theme.space[4], paddingVertical: theme.space[1] }}
      testID={testID}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={{ alignItems: 'center', justifyContent: 'center', width: 84 }}
        testID={testID ? `${testID}-symbol` : undefined}
      >
        {symbol}
      </View>
      <View style={{ flex: 1 }}>
        <UiText variant="subhead" weight={600}>
          {title}
        </UiText>
        <UiText tone="muted" variant="caption">
          {hint}
        </UiText>
      </View>
    </View>
  );
}
