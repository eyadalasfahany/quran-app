import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';

import { UiText } from './UiText';
import { useContrastColors } from './useContrastColors';

// Padding per density, from the frames: one-line cards (onboarding language) and two-line cards
// (reader settings font picker).
const PADDING = {
  regular: { horizontal: 16, vertical: 0 },
  compact: { horizontal: 14, vertical: 8 },
} as const;

/** Single radio option (onboarding language and reader mode, reader settings font). */
export function OnboardingRadioCard({
  selected,
  onPress,
  title,
  subtitle,
  detail,
  trailing,
  density = 'regular',
  accessibilityLabel,
  testID,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  /** A muted second line under the title. */
  subtitle?: string;
  /** A muted caption at the end of the row. */
  detail?: string;
  trailing?: ReactNode;
  density?: keyof typeof PADDING;
  accessibilityLabel?: string;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const border = selected ? theme.colors.brand : colors.line;
  // The frames draw the selected card as a 1 px border plus a 1 px inset ring. React Native has no inset
  // shadow, so the border grows to 2 px and the padding gives the extra pixel back, so nothing moves.
  const ring = selected ? theme.stroke.hairline : 0;
  const padding = PADDING[density];

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}, ${subtitle}` : title)}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: border,
        borderRadius: theme.radius.lg,
        borderWidth: theme.stroke.hairline + ring,
        flexDirection: 'row',
        gap: theme.space[3],
        minHeight: 60,
        opacity: pressed ? theme.opacity.pressed : 1,
        paddingHorizontal: padding.horizontal - ring,
        paddingVertical: Math.max(padding.vertical - ring, 0),
      })}
      testID={testID}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          alignItems: 'center',
          borderColor: selected ? theme.colors.brand : colors.line,
          borderRadius: 10,
          borderWidth: 2,
          height: 20,
          justifyContent: 'center',
          width: 20,
        }}
      >
        {selected ? (
          <View
            style={{
              backgroundColor: theme.colors.brand,
              borderRadius: 5,
              height: 10,
              width: 10,
            }}
          />
        ) : null}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <UiText variant="body" weight={600}>
          {title}
        </UiText>
        {subtitle ? (
          <UiText tone="muted" variant="label" weight={400}>
            {subtitle}
          </UiText>
        ) : null}
      </View>
      {detail ? (
        <UiText tone="muted" variant="caption">
          {detail}
        </UiText>
      ) : null}
      {trailing}
    </Pressable>
  );
}
