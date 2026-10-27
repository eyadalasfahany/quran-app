import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';

import { Icon, type IconName } from './Icon';
import { uiTextProps } from './textStyles';
import { useContrastColors } from './useContrastColors';

export type EmptyStateAction = { label: string; onPress: () => void };

export function EmptyState({
  title,
  body,
  action,
  icon,
  testID,
}: {
  title: string;
  body: string;
  // Empty screens invite the next step, for example "Open the Mushaf".
  action?: EmptyStateAction;
  icon?: IconName;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <View
      style={{ alignItems: 'center', gap: theme.space[3], paddingHorizontal: theme.space[8] }}
      testID={testID}
    >
      {icon ? <Icon color={theme.colors.brand} name={icon} size={48} /> : null}
      <Text
        {...uiTextProps('title')}
        accessibilityRole="header"
        style={[theme.text.title, { color: theme.colors.ink, textAlign: 'center' }]}
      >
        {title}
      </Text>
      <Text {...uiTextProps('subhead')} style={[theme.text.subhead, { color: colors.inkMuted, textAlign: 'center' }]}>
        {body}
      </Text>
      {action ? (
        <Pressable
          accessibilityLabel={action.label}
          accessibilityRole="button"
          onPress={action.onPress}
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: pressed ? theme.colors.fillSecondary : theme.colors.brand,
            borderRadius: theme.radius.pill,
            justifyContent: 'center',
            marginTop: theme.space[1],
            minHeight: 48,
            paddingHorizontal: theme.space[5],
          })}
          testID={testID ? `${testID}-action` : undefined}
        >
          {({ pressed }) => (
            <Text
              {...uiTextProps('headline')}
              style={[theme.text.headline, { color: pressed ? theme.colors.ink : theme.colors.onBrand }]}
            >
              {action.label}
            </Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}
