import { Pressable, View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

/**
 * The «غير محدد» bucket at the end of the timeline: the number of events whose time the book does not state, in a dashed
 * box (dashed means «not stated» everywhere in Seerah). A tap focuses the bucket; a second tap clears it.
 */
export function UnspecifiedChip({
  count,
  label,
  accessibilityLabel,
  selected,
  onPress,
  testID,
}: {
  count: number;
  label: string;
  accessibilityLabel: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const locale = useLocale();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{ alignItems: 'center', gap: theme.space[1], minHeight: theme.size.touchTarget + 18, minWidth: theme.size.touchTarget + 16 }}
      testID={testID}
    >
      <View
        style={{
          alignItems: 'center',
          backgroundColor: selected ? theme.colors.highlightActive : 'transparent',
          borderColor: selected ? theme.colors.brand : theme.colors.line,
          borderRadius: theme.radius.md,
          borderStyle: 'dashed',
          borderWidth: theme.stroke.focus,
          height: theme.size.touchTarget,
          justifyContent: 'center',
          width: theme.size.touchTarget + 16,
        }}
        testID={testID ? `${testID}-box` : undefined}
      >
        <UiText scale="bar" tone={selected ? 'brand' : 'ink'} variant="headline" weight={700}>
          {formatNumber(count, locale)}
        </UiText>
      </View>
      <UiText numberOfLines={1} scale="bar" tone="muted" variant="label" weight={selected ? 700 : 500}>
        {label}
      </UiText>
    </Pressable>
  );
}
