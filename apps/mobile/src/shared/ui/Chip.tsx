import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';

import { uiTextProps } from './textStyles';
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
  // 'radio' inside a single-choice group (the tafsir picker); 'button' for filters.
  role?: 'radio' | 'button';
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const ink = selected ? theme.colors.onBrandSurface : theme.colors.ink;

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
        borderWidth: 1,
        flexDirection: 'row',
        gap: theme.space[2],
        minHeight: 44,
        paddingHorizontal: theme.space[4],
      })}
      testID={testID}
    >
      <View style={{ alignItems: 'baseline', flexDirection: 'row', gap: theme.space[2] }}>
        <Text {...uiTextProps('caption')} style={[theme.text.caption, { color: ink }]}>
          {label}
        </Text>
        {caption ? (
          <Text
            {...uiTextProps('label')}
            style={[theme.text.label, { color: selected ? theme.colors.onBrandSurfaceMuted : colors.inkMuted }]}
          >
            {caption}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
