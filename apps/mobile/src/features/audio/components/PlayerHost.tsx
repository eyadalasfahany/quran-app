import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';

import { spring } from '@/core/theme';

import { PlayerHostContext, type PlayerHostValue } from './player-host-context';
import {
  beginPlayerDrag,
  fadeValue,
  followPlayerDrag,
  releasePlayerDrag,
  springValue,
  type PlayerDrag,
} from './player-motion';

/**
 * The full player as a transparent modal (apps/mobile/CLAUDE.md "Motion"). It slides up from the bottom
 * edge on open and follows a downward drag with the whole screen, so the app shows behind it. A release
 * past the dismiss distance, or a fast flick down, slides it off the bottom edge and then leaves the route.
 * Reduce Motion fades it in and out instead. The stack's own animation and swipe are off.
 */
export function PlayerHost({ children, testID = 'player-host' }: { children: ReactNode; testID?: string }) {
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const springConfig = useMemo(() => spring(), []);

  // Off screen until the open animation runs, so the first frame doesn't flash the player in place.
  const offset = useSharedValue(reduceMotion ? 0 : height);
  const fade = useSharedValue(reduceMotion ? 0 : 1);
  const anchor = useSharedValue(0);
  const anchorY = useSharedValue(0);
  const drag = useMemo<PlayerDrag>(() => ({ anchor, anchorY, offset }), [anchor, anchorY, offset]);
  const scrollOffset = useSharedValue(0);
  const scrollTouched = useSharedValue(false);
  const closing = useRef(false);
  const [overlay, setOverlay] = useState<ReactNode | null>(null);

  // Open: slide up, or fade in under Reduce Motion (the same rule as useSlideUp).
  const openedWithReduceMotion = useRef(reduceMotion);
  useEffect(() => {
    if (openedWithReduceMotion.current) {
      fadeValue(fade, 1);
      return;
    }
    springValue(offset, 0, springConfig);
  }, [fade, offset, springConfig]);

  const leaveRoute = useCallback(() => {
    router.back();
  }, []);

  const close = useCallback(() => {
    if (closing.current) {
      return;
    }
    closing.current = true;
    if (reduceMotion) {
      fadeValue(fade, 0, leaveRoute);
      return;
    }
    springValue(offset, height, springConfig, leaveRoute);
  }, [fade, height, leaveRoute, offset, reduceMotion, springConfig]);

  // Android back slides the player down rather than leaving it to the stack.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => {
      subscription.remove();
    };
  }, [close]);

  // Only downward drags start the pan; a mostly horizontal one (the progress bar) fails it.
  const panGesture = usePanGesture({
    activeOffsetY: 10,
    failOffsetX: [-20, 20],
    onActivate: (event) => {
      'worklet';
      beginPlayerDrag(drag, event.translationY);
    },
    onUpdate: (event) => {
      'worklet';
      followPlayerDrag(drag, event.translationY, scrollTouched.value && scrollOffset.value > 0);
    },
    onDeactivate: (event) => {
      'worklet';
      releasePlayerDrag(drag, event.velocityY, height, springConfig, close);
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: offset.value }],
  }));

  const value = useMemo<PlayerHostValue>(
    () => ({ close, panGesture, scrollOffset, scrollTouched, setOverlay }),
    [close, panGesture, scrollOffset, scrollTouched],
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PlayerHostContext.Provider value={value}>
        <GestureDetector gesture={panGesture}>
          <Animated.View
            accessibilityActions={[{ label: t('player.minimize'), name: 'dismiss' }]}
            accessibilityViewIsModal
            onAccessibilityAction={(event) => {
              if (event.nativeEvent.actionName === 'dismiss') {
                close();
              }
            }}
            onAccessibilityEscape={close}
            style={[{ flex: 1 }, animatedStyle]}
            testID={testID}
          >
            {children}
            {overlay === null ? null : (
              <View pointerEvents="box-none" style={StyleSheet.absoluteFill} testID={`${testID}-overlay`}>
                {overlay}
              </View>
            )}
          </Animated.View>
        </GestureDetector>
      </PlayerHostContext.Provider>
    </GestureHandlerRootView>
  );
}
