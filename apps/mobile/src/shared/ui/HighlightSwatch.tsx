import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';

import { highlightFill, type HighlightColor } from './highlight';
import { Icon } from './Icon';
import { useContrastColors } from './useContrastColors';

const CHECK = { ios: 'checkmark', android: 'check' } as const;

// Selection is a ring and a check mark, never colour alone; the label names the colour.
export function HighlightSwatch({
  color,
  selected,
  onPress,
  testID,
}: {
  color: HighlightColor;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const dot = theme.size.swatch;
  const ringWidth = theme.stroke.selectedRing;
  const ring = dot + 2 * (theme.size.selectedRingGap + ringWidth);

  return (
    <Pressable
      accessibilityLabel={t(`ui.highlight.${color}`)}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        alignItems: 'center',
        height: theme.size.touchTarget,
        justifyContent: 'center',
        width: theme.size.touchTarget,
      }}
      testID={testID}
    >
      <View
        style={{
          alignItems: 'center',
          borderColor: selected ? theme.colors.ink : 'transparent',
          borderRadius: ring / 2,
          borderWidth: ringWidth,
          height: ring,
          justifyContent: 'center',
          width: ring,
        }}
        testID={testID ? `${testID}-ring` : undefined}
      >
        <View
          style={{
            alignItems: 'center',
            backgroundColor: highlightFill(theme.colors, color),
            borderColor: colors.lineStrong,
            borderRadius: dot / 2,
            borderWidth: theme.stroke.swatch,
            height: dot,
            justifyContent: 'center',
            width: dot,
          }}
          testID={testID ? `${testID}-dot` : undefined}
        >
          {selected ? <Icon color={theme.colors.ink} name={CHECK} size={theme.size.swatchCheck} testID="highlight-swatch-check" /> : null}
        </View>
      </View>
    </Pressable>
  );
}
