import { Pressable, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { timing, useTheme } from '@/core/theme';
import { useContrastColors } from '@/shared/ui';

const DOT = 6;
const ACTIVE_HEIGHT = 18;
const MARK_WIDTH = 28;
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
      style={{ gap: theme.space[2], left: 10, position: 'absolute', top: '38%' }}
      testID={testID}
    >
      {Array.from({ length: count }, (_, index) => {
        const active = index === activeIndex;
        const number = start + index;
        return (
          <Pressable
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            key={number}
            onPress={onSelect === undefined || active ? undefined : () => onSelect(number)}
            testID={`${testID}-page-${number}`}
            style={{ alignItems: 'center', height: ACTIVE_HEIGHT, justifyContent: 'center', width: MARK_WIDTH }}
          >
            <Animated.View
              layout={markLayout}
              style={{
                backgroundColor: active ? colors.brand : colors.lineStrong,
                borderRadius: theme.radius.sm,
                height: active ? ACTIVE_HEIGHT : DOT,
                width: DOT,
              }}
              testID={active ? `${testID}-active` : `${testID}-dot-${number}`}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
