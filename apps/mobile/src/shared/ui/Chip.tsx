import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';

import { UiText } from './UiText';
import { useContrastColors } from './useContrastColors';

// 'sheet' is the phone sheet's chip (radius 19); 'panel' is the side panel's (radius 22).
export type ChipLayout = 'sheet' | 'panel';

export function Chip({
  label,
  caption,
  selected,
  onPress,
  role = 'button',
  layout = 'panel',
  testID,
}: {
  label: string;
  caption?: string;
  selected: boolean;
  onPress: () => void;
  role?: 'radio' | 'button';
  layout?: ChipLayout;
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
        borderRadius: layout === 'sheet' ? theme.radius.chipSheet : theme.radius.chipPanel,
        borderWidth: theme.stroke.hairline,
        flexDirection: 'row',
        minHeight: theme.size.touchTarget,
        paddingHorizontal: theme.size.chipPaddingX,
      })}
      testID={testID}
    >
      <View style={{ alignItems: 'baseline', flexDirection: 'row', gap: theme.size.chipGap }}>
        <UiText style={selected ? { color: theme.colors.onBrandSurface } : null} variant="caption" weight={600}>
          {label}
        </UiText>
        {caption ? (
          // The caption is the label's colour at 0.8 opacity, in the frames.
          <UiText
            style={[
              { opacity: theme.opacity.chipCaption },
              selected ? { color: theme.colors.onBrandSurface } : null,
            ]}
            variant="label"
          >
            {caption}
          </UiText>
        ) : null}
      </View>
    </Pressable>
  );
}
