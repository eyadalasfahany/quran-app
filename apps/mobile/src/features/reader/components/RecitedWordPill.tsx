import { useEffect, useLayoutEffect, useRef } from 'react';
import { I18nManager } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { timing, useTheme } from '@/core/theme';
import { useContrastColors } from '@/shared/ui';

import type { Rect } from '../word-pill';

/**
 * The rounded pill behind the recited word (ADR 0039). It slides to the next word on the same line (translateX and
 * width, timing 'fast') and jumps otherwise. Under Reduce Motion it always jumps. `onArrive` runs when the move ends.
 */
export function RecitedWordPill({
  rect,
  move,
  containerWidth,
  testID,
  onArrive,
}: {
  rect: Rect | null;
  move: 'slide' | 'jump';
  containerWidth: number;
  testID?: string;
  onArrive?: () => void;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const reduceMotion = useReducedMotion();
  const rtl = I18nManager.isRTL;

  const x = useSharedValue(rect?.x ?? 0);
  const y = useSharedValue(rect?.y ?? 0);
  const width = useSharedValue(rect?.width ?? 0);
  const height = useSharedValue(rect?.height ?? 0);

  // The effect reads the latest callback without re-running the move when only the callback changes.
  const onArriveRef = useRef(onArrive);
  useLayoutEffect(() => {
    onArriveRef.current = onArrive;
  });

  const targetX = rect?.x ?? 0;
  const targetY = rect?.y ?? 0;
  const targetWidth = rect?.width ?? 0;
  const targetHeight = rect?.height ?? 0;
  const hasRect = rect !== null;

  useEffect(() => {
    if (!hasRect) {
      return;
    }
    const arrive = onArriveRef.current;
    y.value = targetY;
    height.value = targetHeight;
    if (move === 'slide' && !reduceMotion) {
      x.value = withTiming(targetX, timing('fast'));
      width.value = withTiming(targetWidth, timing('fast'), (finished) => {
        if (finished && arrive) {
          scheduleOnRN(arrive);
        }
      });
      return;
    }
    x.value = targetX;
    width.value = targetWidth;
    arrive?.();
  }, [hasRect, targetX, targetY, targetWidth, targetHeight, move, reduceMotion, x, y, width, height]);

  const animatedStyle = useAnimatedStyle(
    () => ({
      height: height.value,
      transform: [
        { translateX: rtl ? x.value - (containerWidth - width.value) : x.value },
        { translateY: y.value },
      ],
      width: width.value,
    }),
    [rtl, containerWidth],
  );

  if (rect === null) {
    return null;
  }

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[
        {
          backgroundColor: colors.brandSurface,
          borderRadius: theme.radius.sm,
          position: 'absolute',
          start: 0,
          top: 0,
        },
        animatedStyle,
      ]}
      testID={testID}
    />
  );
}
