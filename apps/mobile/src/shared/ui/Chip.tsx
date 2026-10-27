import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';

import { UiText } from './UiText';
import { useContrastColors } from './useContrastColors';

export function Chip({
  label,
  caption,
  selected,
  onPress,
  role = 'button',
  testID,
}: {
  label: string;
  caption?: string;
  selected: boolean;
  onPress: () => void;
  role?: 'radio' | 'button';
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <Pressable
      accessibilityLabel={caption ? `${label}, ${caption}` : label}
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { checked: selected } : { selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: selected
          ? theme.colors.brandSurface
          : pressed
            ? theme.colors.fillSecondary
            : theme.colors.surfaceRaised,
        borderColor: selected ? theme.colors.brandSurface : colors.line,
        borderRadius: theme.radius.pill,
        borderWidth: theme.stroke.hairline,
        flexDirection: 'row',
        gap: theme.space[2],
        minHeight: theme.size.touchTarget,
        paddingHorizontal: theme.space[4],
      })}
      testID={testID}
    >
      <View style={{ alignItems: 'baseline', flexDirection: 'row', gap: theme.space[2] }}>
        <UiText style={selected ? { color: theme.colors.onBrandSurface } : null} variant="caption">
          {label}
        </UiText>
        {caption ? (
          <UiText
            style={selected ? { color: theme.colors.onBrandSurfaceMuted } : null}
            tone="muted"
            variant="label"
          >
            {caption}
          </UiText>
        ) : null}
      </View>
    </Pressable>
  );
}
