import { GlassView } from 'expo-glass-effect';
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { spring, timing, useGlass, useTheme } from '@/core/theme';

import { ConfirmDialogActions } from './ConfirmDialogActions';
import { ConfirmDialogIcon } from './ConfirmDialogIcon';
import type { IconName } from './Icon';
import { UiText } from './UiText';
import { useContrastColors } from './useContrastColors';

/** The card's largest width (quran-app-screens.html, SibhaResetDialog); on a phone it is the window less 24 pt on each side. */
const CARD_MAX_WIDTH = 340;
const CARD_SCREEN_MARGIN = 24;
/** The card springs up from 92% when it opens and shrinks to 96% when it closes, which is quicker. */
const ENTER_SCALE = 0.92;
const EXIT_SCALE = 0.96;

/**
 * An in-app confirmation (the design system's ConfirmDialog, quran-app-design-system.html). It replaces Alert.alert,
 * which draws a plain system box that ignores the app's theme and reading direction.
 *
 * A centred card over a dimmed scrim, with an optional icon badge. The scrim is native blur where Liquid Glass is
 * available, with the theme's scrim on top. Opening fades the scrim and the card in and springs the card up from 92%;
 * closing fades it out and shrinks it to 96%. Under Reduce Motion the card only fades. Cancel, a tap on the scrim and
 * Android back all call `onCancel`; the parent closes the dialog by setting `visible` to false, so the exit animation
 * always runs. Without `cancelLabel` the dialog has one full-width button, which is the case for a notice. Buttons
 * follow the reading direction: Cancel is at the start and the confirm action at the end, stacked when the labels do
 * not fit (see ConfirmDialogActions).
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  icon,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onCancel,
  children,
  testID = 'confirm-dialog',
}: {
  visible: boolean;
  title: string;
  message?: string;
  /** Extra body content after the message and before the actions (widget preview, pickers). */
  children?: ReactNode;
  // The badge at the top of the card. Destructive dialogs draw it in the danger colour.
  icon?: IconName;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const reduceMotion = useReducedMotion();
  const nativeGlass = useGlass();
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = Math.min(CARD_MAX_WIDTH, windowWidth - CARD_SCREEN_MARGIN * 2);
  // The modal stays mounted until the exit animation has finished, so the card can leave on screen.
  const [mounted, setMounted] = useState(visible);
  // 0 hidden, 1 shown. The scrim and the card both fade with it.
  const open = useSharedValue(0);
  const scale = useSharedValue(ENTER_SCALE);
  const titleRef = useRef<ComponentRef<typeof View>>(null);

  // Opening mounts the modal during render, React's pattern for state that follows a prop, so the effect only animates.
  if (visible && !mounted) {
    setMounted(true);
  }

  useEffect(() => {
    if (visible) {
      open.value = withTiming(1, timing('standard'));
      if (reduceMotion) {
        scale.value = 1;
      } else {
        // Re-opening starts from the enter scale even after an exit left the card at 96%. The card is still at 0 opacity.
        scale.value = ENTER_SCALE;
        scale.value = withSpring(1, spring());
      }
      return;
    }
    open.value = withTiming(0, timing('fast'), (finished) => {
      if (finished) {
        runOnJS(setMounted)(false);
      }
    });
    scale.value = reduceMotion ? 1 : withTiming(EXIT_SCALE, timing('fast'));
  }, [open, reduceMotion, scale, visible]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: open.value }));
  const cardStyle = useAnimatedStyle(() => ({ opacity: open.value, transform: [{ scale: scale.value }] }));

  // VoiceOver and TalkBack start on the title once the modal is on screen.
  const focusTitle = () => {
    const tag = titleRef.current ? findNodeHandle(titleRef.current) : null;
    if (typeof tag === 'number') {
      AccessibilityInfo.setAccessibilityFocus(tag);
    }
  };

  return (
    <Modal
      animationType="none"
      onRequestClose={onCancel}
      onShow={focusTitle}
      statusBarTranslucent
      transparent
      visible={mounted}
    >
      <View style={styles.root} testID={testID}>
        <Animated.View style={[StyleSheet.absoluteFill, scrimStyle]}>
          {nativeGlass ? (
            <GlassView
              colorScheme="auto"
              glassEffectStyle="regular"
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
              testID={`${testID}-scrim-glass`}
            />
          ) : null}
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.scrim }]}
            testID={`${testID}-dim`}
          />
          <Pressable
            accessible={false}
            onPress={onCancel}
            style={StyleSheet.absoluteFill}
            testID={`${testID}-scrim`}
          />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          style={[
            {
              alignSelf: 'center',
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: colors.line,
              // The hairline is for dark mode only; in light the surface and the soft shadow already set the card apart.
              borderRadius: theme.radius.xl,
              borderWidth: theme.name === 'dark' ? theme.stroke.hairline : 0,
              boxShadow: theme.shadows.glass,
              paddingBottom: theme.space[5],
              paddingHorizontal: theme.space[5],
              paddingTop: theme.space[6],
              width: cardWidth,
            },
            cardStyle,
          ]}
          testID={`${testID}-card`}
        >
          <View style={{ alignItems: 'center', gap: theme.space[2] }}>
            {icon ? (
              <ConfirmDialogIcon
                icon={icon}
                testID={`${testID}-icon`}
                tone={destructive ? 'destructive' : 'brand'}
              />
            ) : null}
            <View
              accessible
              accessibilityRole="header"
              ref={titleRef}
              style={{ alignSelf: 'stretch' }}
              testID={`${testID}-title`}
            >
              <UiText align="center" variant="title" weight={600}>
                {title}
              </UiText>
            </View>
            {message ? (
              <UiText
                align="center"
                style={{ alignSelf: 'stretch' }}
                testID={`${testID}-message`}
                tone="muted"
                variant="body"
              >
                {message}
              </UiText>
            ) : null}
          </View>
          {children ? <View style={{ marginTop: theme.space[4] }}>{children}</View> : null}
          <View style={{ marginTop: theme.space[6] }}>
            <ConfirmDialogActions
              cancelLabel={cancelLabel}
              confirmLabel={confirmLabel}
              destructive={destructive}
              onCancel={onCancel}
              onConfirm={onConfirm}
              testID={testID}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
