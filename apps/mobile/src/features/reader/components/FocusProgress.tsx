import { Pressable, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { timing, useTheme } from '@/core/theme';
import { useContrastColors } from '@/shared/ui';

const WINDOW = 7;

const { duration: fast = 0 } = timing('fast');
const markLayout = LinearTransition.duration(fast);

/** One mark per ayah. Long surahs keep a short window around the current ayah. */
export function focusDotCount(
  versesCount: number,
  verseNumber: number,
): { activeIndex: number; count: number; start: number } {
  if (versesCount <= WINDOW) {
    return { activeIndex: Math.max(0, verseNumber - 1), count: Math.max(versesCount, 1), start: 1 };
  }
  const start = Math.min(Math.max(1, verseNumber - 3), versesCount - WINDOW + 1);
  return { activeIndex: verseNumber - start, count: WINDOW, start };
}

export function FocusProgress({
  verseNumber,
  versesCount,
  onSelect,
  testID = 'focus-progress',
}: {
  verseNumber: number;
  versesCount: number;
  onSelect?: (verseNumber: number) => void;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const { activeIndex, count, start } = focusDotCount(versesCount, verseNumber);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      // `end` is the trailing edge: the left in Arabic (the frame's left: 10), the right in English.
      style={{ end: theme.size.focusDotInset, gap: theme.space[2], position: 'absolute', top: '38%' }}
      testID={testID}
    >
      {Array.from({ length: count }, (_, index) => {
        const active = index === activeIndex;
        const number = start + index;
        return (
          <Pressable
            accessibilityElementsHidden
            hitSlop={theme.space[2]}
            importantForAccessibility="no-hide-descendants"
            key={number}
            onPress={onSelect === undefined || active ? undefined : () => onSelect(number)}
            style={{ width: theme.size.focusDot }}
            testID={`${testID}-page-${number}`}
          >
            <Animated.View
              layout={markLayout}
              style={{
                backgroundColor: active ? colors.brand : colors.lineStrong,
                borderRadius: theme.size.focusDotRadius,
                height: active ? theme.size.focusDotActive : theme.size.focusDot,
                width: theme.size.focusDot,
              }}
              testID={active ? `${testID}-active` : `${testID}-dot-${number}`}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
