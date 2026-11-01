import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';

import { UiText } from './UiText';
import { useContrastColors } from './useContrastColors';

/** Single radio option in onboarding (language, reader mode). */
export function OnboardingRadioCard({
  selected,
  onPress,
  title,
  detail,
  trailing,
  accessibilityLabel,
  testID,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  detail?: string;
  trailing?: ReactNode;
  accessibilityLabel?: string;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const border = selected ? theme.colors.brand : colors.line;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: border,
        borderRadius: theme.radius.lg,
        borderWidth: theme.stroke.hairline,
        flexDirection: 'row',
        gap: theme.space[3],
        minHeight: 60,
        opacity: pressed ? theme.opacity.pressed : 1,
        paddingHorizontal: theme.space[4],
        ...(selected ? { borderWidth: 1 } : {}),
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
      <UiText style={{ flex: 1 }} variant="body" weight={600}>
        {title}
      </UiText>
      {detail ? (
        <UiText tone="muted" variant="caption">
          {detail}
        </UiText>
      ) : null}
      {trailing}
    </Pressable>
  );
}
