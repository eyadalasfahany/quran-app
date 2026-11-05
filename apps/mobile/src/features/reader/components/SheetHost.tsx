import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BackHandler, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWidthClass } from '@/core/layout/useWindowClass';
import { spring, useTheme } from '@/core/theme';

import { isShortWindow, openingDetent, sheetDetents, SHEET_CARD_MAX_WIDTH, type Detent } from '../form-sheet';
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
 *
 * Two window cases change the shape. On a window at least 600 pt wide (medium or expanded by width, ADR 0036) the card is
 * centred, 560 wide at most (spec §4). In a short window (under 500 pt) mid would hide the content, so the sheet opens at
 * full, its only detent, and scrolls there.
 */
export function SheetHost({
  children,
  testID = 'sheet-host',
  initialDetent,
}: {
  children: ReactNode;
  testID?: string;
  /** The detent the sheet opens at, when its content needs the room (a long editor). Omitted, it opens at mid. A short window always opens at full. */
  initialDetent?: 'mid' | 'full';
}) {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  // Width decides the card shape, not the layout class: a landscape phone is wide, so it gets the centred card (ADR 0036).
  const widthClass = useWidthClass();
  const centred = widthClass !== 'compact';
  const short = isShortWindow(height);
  const { top: safeTop } = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const detents = useMemo(() => sheetDetents(height, safeTop), [height, safeTop]);
  // Read once at mount: a resize that crosses the short-window line is handled by the effect below, not by a re-open.
  // A short window opens at full whatever is asked for (mid would hide the content); otherwise `initialDetent` wins, else mid.
  const [opening] = useState<'full' | 'mid'>(() => (openingDetent(height) === 'full' ? 'full' : (initialDetent ?? 'mid')));

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
  const [detent, setDetent] = useState<Detent>(opening);
  const closing = useRef(false);
  const springConfig = useMemo(() => spring(), []);

  // Keep the detents in step with the window (rotation, a fold).
  useEffect(() => {
    layoutSheet(motion, detents);
  }, [detents, motion]);

  // Open at the opening detent (mid, or full in a short window). The card starts closed, so the first frame is off screen.
  const reduceMotionAtOpen = useRef(reduceMotion);
  useEffect(() => {
    openSheet(motion, reduceMotionAtOpen.current, springConfig, opening);
  }, [motion, opening, springConfig]);

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
    (requested: 'full' | 'mid') => {
      if (closing.current) {
        return;
      }
      // In a short window mid is the full detent, so a request for mid stays at full and the content keeps scrolling.
      const target = short ? 'full' : requested;
      setDetent(target);
      snapSheet(motion, target, springConfig);
    },
    [motion, short, springConfig],
  );
  const expand = useCallback(() => moveTo('full'), [moveTo]);
  const collapse = useCallback(() => moveTo('mid'), [moveTo]);

  // A resize that makes the window short while the card rests at mid moves it to full.
  useEffect(() => {
    if (short && detent === 'mid') {
      moveTo('full');
    }
  }, [detent, moveTo, short]);

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
        {/* A tap target only: the sheet's X and the system back gesture already close it, so it is hidden from VoiceOver and TalkBack. */}
        <Pressable
          accessible={false}
          importantForAccessibility="no"
          onPress={close}
          style={StyleSheet.absoluteFill}
          testID="sheet-backdrop"
        />
        <GestureDetector gesture={panGesture}>
          <Animated.View
            accessibilityViewIsModal
            onAccessibilityEscape={close}
            style={[
              { bottom: 0, left: 0, position: 'absolute', right: 0 },
              centred ? { alignItems: 'center' } : null,
              cardStyle,
            ]}
            testID={testID}
          >
            <View
              style={{ flex: 1, maxWidth: centred ? SHEET_CARD_MAX_WIDTH : undefined, width: '100%' }}
              testID={`${testID}-column`}
            >
              {children}
            </View>
          </Animated.View>
        </GestureDetector>
      </SheetContext.Provider>
    </GestureHandlerRootView>
  );
}
