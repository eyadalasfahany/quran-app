import type { ReactNode } from 'react';
import { Platform, Switch, View } from 'react-native';

import { useTheme } from '@/core/theme';

import { ListRow } from './ListRow';

/**
 * The switch thumb. iOS keeps the system thumb. Android's off thumb is ink-muted so it reads on the fill-secondary
 * track (3:1 or better in every theme); surface-raised there was near-invisible in dark.
 */
export function switchThumbColor(
  os: string,
  value: boolean,
  colors: { surfaceRaised: string; inkMuted: string },
): string | undefined {
  if (os === 'ios') {
    return undefined;
  }
  return value ? colors.surfaceRaised : colors.inkMuted;
}

// A setting that turns on and off, drawn with the platform switch (ADR 0012 §7).
// `accessory` sits before the switch in the trailing area (the daily goals' reminder bell).
export function ToggleRow({
  title,
  subtitle,
  value,
  onValueChange,
  onPress,
  separator,
  testID,
  accessory,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  onPress?: () => void;
  separator?: 'line' | 'strong';
  testID?: string;
  accessory?: ReactNode;
}) {
  const theme = useTheme();

  const toggle = (
    <Switch
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      ios_backgroundColor={theme.colors.fillSecondary}
      onValueChange={onValueChange}
      testID={testID}
      thumbColor={switchThumbColor(Platform.OS, value, theme.colors)}
      trackColor={{ false: theme.colors.fillSecondary, true: theme.colors.brand }}
      value={value}
    />
  );

  return (
    <ListRow
      onPress={onPress}
      separator={separator}
      subtitle={subtitle}
      testID={testID ? `${testID}-row` : undefined}
      title={title}
      trailing={
        accessory === undefined ? (
          toggle
        ) : (
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[2] }}>
            {accessory}
            {toggle}
          </View>
        )
      }
    />
  );
}
