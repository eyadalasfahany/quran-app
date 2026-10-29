import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spring, useTheme } from '@/core/theme';

import { sheetDetents, type Detent } from '../form-sheet';
import { SheetContext, type SheetContextValue } from './sheet-context';
import {
  beginDrag,
  closeSheet,
  followDrag,
  layoutSheet,
  openSheet,
  releaseDrag,
  snapSheet,
  type SheetMotion,
} from './sheet-motion';

/**
 * A reader sheet: a custom card in a transparent modal over a scrim (ADR 0013), with a mid detent at
 * half the window and a full detent under the safe area (ADR 0020). The card slides up on open,
 * drags between detents and slides down to close. The stack's own animation is off.
 */
export function SheetHost({ children, testID = 'sheet-host' }: { children: ReactNode; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const { top: safeTop } = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const detents = useMemo(() => sheetDetents(height, safeTop), [height, safeTop]);

  // The shared values the card, scrim and gestures read on the UI thread.
  const positions = useSharedValue(detents);
  // Closed until the open animation runs, so the layout effect doesn't snap the card into place first.
  const detentValue = useSharedValue<Detent>('closed');
  const top = useSharedValue(detents.closed);
  const fade = useSharedValue(reduceMotion ? 0 : 1);
  const scrollOffset = useSharedValue(0);
  const scrollTouched = useSharedValue(false);
  const anchorTop = useSharedValue(detents.closed);
  const anchorY = useSharedValue(0);
  const activationTop = useSharedValue(detents.closed);
  const dragged = useSharedValue(false);
  const motion = useMemo<SheetMotion>(
    () => ({
      activationTop,
      anchorTop,
      anchorY,
      detent: detentValue,
      dragged,
      fade,
      positions,
      scrollOffset,
      scrollTouched,
      top,
    }),
    [activationTop, anchorTop, anchorY, detentValue, dragged, fade, positions, scrollOffset, scrollTouched, top],
  );

  // The detent is mirrored into React state for consumers; the shared value is the source for gestures.
  const [detent, setDetent] = useState<Detent>('mid');
  const closing = useRef(false);
  const springConfig = useMemo(() => spring(), []);

  // Keep the detents in step with the window (rotation, a fold).
  useEffect(() => {
    layoutSheet(motion, detents);
  }, [detents, motion]);

  // Open at mid. The card starts closed, so the first frame is off screen.
  const reduceMotionAtOpen = useRef(reduceMotion);
  useEffect(() => {
    openSheet(motion, reduceMotionAtOpen.current, springConfig);
  }, [motion, springConfig]);

  const leaveRoute = useCallback(() => {
    router.back();
  }, []);

  const close = useCallback(() => {
    if (closing.current) {
      return;
    }
    closing.current = true;
    setDetent('closed');
    closeSheet(motion, reduceMotion, springConfig, leaveRoute);
  }, [leaveRoute, motion, reduceMotion, springConfig]);

  const moveTo = useCallback(
    (target: 'full' | 'mid') => {
      if (closing.current) {
        return;
      }
      setDetent(target);
      snapSheet(motion, target, springConfig);
    },
    [motion, springConfig],
  );
  const expand = useCallback(() => moveTo('full'), [moveTo]);
  const collapse = useCallback(() => moveTo('mid'), [moveTo]);

  // Android back slides the sheet down rather than leaving it to the stack.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => {
      subscription.remove();
    };
  }, [close]);

  const panGesture = usePanGesture({
    // A vertical drag of 10 pt starts the sheet; a mostly horizontal one (a chip row, a stepper) does not.
    activeOffsetY: [-10, 10],
    enabled: detent !== 'closed',
    failOffsetX: [-20, 20],
    onActivate: (event) => {
      'worklet';
      beginDrag(motion, event.translationY);
    },
    onUpdate: (event) => {
      'worklet';
      followDrag(motion, event.translationY);
    },
    onDeactivate: (event) => {
      'worklet';
      releaseDrag(motion, event.velocityY, springConfig, setDetent, close);
    },
  });

  const cardStyle = useAnimatedStyle(() => ({ opacity: fade.value, top: top.value }));
  const scrimStyle = useAnimatedStyle(() => ({
    opacity:
      interpolate(top.value, [positions.value.mid, positions.value.closed], [1, 0], Extrapolation.CLAMP) * fade.value,
  }));

  const sheet = useMemo<SheetContextValue>(
    () => ({ close, collapse, detent, expand, panGesture, scrollOffset, scrollTouched }),
    [close, collapse, detent, expand, panGesture, scrollOffset, scrollTouched],
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SheetContext.Provider value={sheet}>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.scrim }, scrimStyle]}
          testID="sheet-scrim"
        />
        <Pressable
          accessibilityLabel={t('reader.sheet.close')}
          accessibilityRole="button"
          onPress={close}
          style={StyleSheet.absoluteFill}
          testID="sheet-backdrop"
        />
        <GestureDetector gesture={panGesture}>
          <Animated.View
            accessibilityViewIsModal
            onAccessibilityEscape={close}
            style={[{ bottom: 0, left: 0, position: 'absolute', right: 0 }, cardStyle]}
            testID={testID}
          >
            {children}
          </Animated.View>
        </GestureDetector>
      </SheetContext.Provider>
    </GestureHandlerRootView>
  );
}
