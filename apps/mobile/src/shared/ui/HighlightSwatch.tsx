import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';

import { Icon } from './Icon';
import { useContrastColors } from './useContrastColors';

export type HighlightColor = 'gold' | 'green' | 'blue' | 'rose';

const DOT = 28;
const RING_GAP = 3;
const RING_WIDTH = 2;
const CHECK = { ios: 'checkmark', android: 'check' } as const;

const fills = {
  gold: 'highlightGold',
  green: 'highlightGreen',
  blue: 'highlightBlue',
  rose: 'highlightRose',
} as const;

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
  const ring = DOT + 2 * (RING_GAP + RING_WIDTH);

  return (
    <Pressable
      accessibilityLabel={t(`ui.highlight.${color}`)}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{ alignItems: 'center', height: 44, justifyContent: 'center', width: 44 }}
      testID={testID}
    >
      <View
        style={{
          alignItems: 'center',
          borderColor: selected ? theme.colors.ink : 'transparent',
          borderRadius: ring / 2,
          borderWidth: RING_WIDTH,
          height: ring,
          justifyContent: 'center',
          width: ring,
        }}
        testID={testID ? `${testID}-ring` : undefined}
      >
        <View
          style={{
            alignItems: 'center',
            backgroundColor: theme.colors[fills[color]],
            borderColor: colors.lineStrong,
            borderRadius: DOT / 2,
            borderWidth: 1.5,
            height: DOT,
            justifyContent: 'center',
            width: DOT,
          }}
          testID={testID ? `${testID}-dot` : undefined}
        >
          {selected ? <Icon color={theme.colors.ink} name={CHECK} size={17} testID="highlight-swatch-check" /> : null}
        </View>
      </View>
    </Pressable>
  );
}
