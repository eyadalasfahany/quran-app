import { View } from 'react-native';

import { useTheme } from '@/core/theme';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { UiText } from './UiText';

export type EmptyStateAction = { label: string; onPress: () => void };

export function EmptyState({
  title,
  body,
  action,
  icon,
  testID,
}: {
  title: string;
  /** Optional: a state that needs only its title (a missing reciter) draws none. */
  body?: string;
  action?: EmptyStateAction;
  icon?: IconName;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View
      style={{ alignItems: 'center', gap: theme.space[3], paddingHorizontal: theme.space[8] }}
      testID={testID}
    >
      {icon ? <Icon color={theme.colors.brand} name={icon} size={48} /> : null}
      <UiText accessibilityRole="header" align="center" variant="title">
        {title}
      </UiText>
      {body ? (
        <UiText align="center" tone="muted" variant="subhead">
          {body}
        </UiText>
      ) : null}
      {action ? (
        <Button
          label={action.label}
          onPress={action.onPress}
          style={{ alignSelf: 'center', marginTop: theme.space[1] }}
          testID={testID ? `${testID}-action` : undefined}
          variant="primary"
        />
      ) : null}
    </View>
  );
}
