import { Switch } from 'react-native';

import { useTheme } from '@/core/theme';

import { ListRow } from './ListRow';

// A setting that turns on and off, drawn with the platform switch (ADR 0012 §7).
export function ToggleRow({
  title,
  subtitle,
  value,
  onValueChange,
  separator,
  testID,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  separator?: 'line' | 'strong';
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <ListRow
      separator={separator}
      subtitle={subtitle}
      testID={testID ? `${testID}-row` : undefined}
      title={title}
      trailing={
        <Switch
          accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
          accessibilityRole="switch"
          accessibilityState={{ checked: value }}
          ios_backgroundColor={theme.colors.fillSecondary}
          onValueChange={onValueChange}
          testID={testID}
          thumbColor={theme.colors.surfaceRaised}
          trackColor={{ false: theme.colors.fillSecondary, true: theme.colors.brand }}
          value={value}
        />
      }
    />
  );
}
