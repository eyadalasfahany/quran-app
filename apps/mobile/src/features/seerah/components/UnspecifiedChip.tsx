import { Pressable, View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { UiText, useContrastColors } from '@/shared/ui';

/**
 * The «غير محدد» bucket at the end of the timeline: the number of events whose time the book does not state, in a dashed
 * box (dashed means «not stated» everywhere in Seerah). A tap focuses the bucket; a second tap clears it.
 */
export function UnspecifiedChip({
  count,
  label,
  accessibilityLabel,
  selected,
  dimmed = false,
  onPress,
  testID,
}: {
  count: number;
  label: string;
  accessibilityLabel: string;
  selected: boolean;
  /** An age is selected: the bucket fades (frame SeerahMapRegionYear). */
  dimmed?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const locale = useLocale();

  const colors = useContrastColors();

  // Frame SeerahMapRegion: a 52 × 38 dashed box (radius 10) whose bottom sits 21 pt above the slider's bottom, the count
  // at 13 bold, and the name at 11 on the bands' baseline. It fades while an age is selected.
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{ alignItems: 'center', height: 74, opacity: dimmed ? theme.opacity.disabled : 1, width: 52 }}
      testID={testID}
    >
      <View
        style={{
          alignItems: 'center',
          backgroundColor: selected ? theme.colors.highlightActive : 'transparent',
          borderColor: selected ? theme.colors.brand : colors.lineStrong,
          borderRadius: 10,
          borderStyle: 'dashed',
          borderWidth: theme.stroke.focus,
          height: 38,
          justifyContent: 'center',
          marginTop: 15,
          width: 52,
        }}
        testID={testID ? `${testID}-box` : undefined}
      >
        <UiText scale="bar" style={{ fontSize: 13, lineHeight: 15 }} tone={selected ? 'brand' : 'muted'} variant="caption" weight={700}>
          {formatNumber(count, locale)}
        </UiText>
      </View>
      <UiText numberOfLines={1} scale="bar" style={{ fontSize: 11, left: -8, lineHeight: 14, position: 'absolute', right: -8, textAlign: 'center', top: 59 }} tone="muted" variant="label" weight={selected ? 700 : 500}>
        {label}
      </UiText>
    </Pressable>
  );
}
