import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, UiText, useContrastColors, type IconName } from '@/shared/ui';

import type { EdgeDirection } from '../logic';

import { CountDisc } from './CountDisc';

export type EdgeChipDirection = EdgeDirection | 'other';

const ICONS: Record<EdgeChipDirection, IconName> = {
  north: { ios: 'arrow.up', android: 'arrow_upward' },
  south: { ios: 'arrow.down', android: 'arrow_downward' },
  west: { ios: 'arrow.left', android: 'arrow_back' },
  east: { ios: 'arrow.right', android: 'arrow_forward' },
  other: { ios: 'mappin', android: 'location_on' },
};

/**
 * A chip fixed to the screen's edge for events the map cannot show in place: a region beyond the window (an arrow to its
 * side, a tap pans there) or the «أخرى» bucket (a dashed edge and a pin, no position). 44 pt tall.
 */
export function EdgeChip({
  label,
  count,
  direction,
  accessibilityLabel,
  accessibilityHint,
  dimmed = false,
  onPress,
  testID,
}: {
  label: string;
  count: number;
  direction: EdgeChipDirection;
  accessibilityLabel: string;
  accessibilityHint?: string;
  dimmed?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const other = direction === 'other';

  return (
    <Pressable
      accessibilityElementsHidden={dimmed}
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      importantForAccessibility={dimmed ? 'no-hide-descendants' : 'auto'}
      onPress={onPress}
      style={{
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: other ? colors.inkMuted : colors.line,
        borderRadius: theme.radius.pill,
        borderStyle: other ? 'dashed' : 'solid',
        borderWidth: other ? theme.stroke.focus : theme.stroke.hairline,
        flexDirection: 'row',
        gap: theme.space[2],
        minHeight: theme.size.touchTarget,
        opacity: dimmed ? theme.opacity.disabled : 1,
        paddingEnd: theme.space[4],
        paddingStart: theme.space[2],
      }}
      testID={testID}
    >
      <CountDisc count={count} size={30} />
      <View>
        <UiText scale="bar" variant="headline">
          {label}
        </UiText>
      </View>
      <Icon color={colors.inkMuted} name={ICONS[direction]} size={theme.size.iconSm} />
    </Pressable>
  );
}
