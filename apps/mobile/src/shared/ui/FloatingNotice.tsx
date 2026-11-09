import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { useTheme } from '@/core/theme';
import { spring } from '@/core/theme/motion';

import { Button } from './Button';
import { GlassSurface } from './GlassSurface';
import { Icon, type IconName } from './Icon';
import { UiText } from './UiText';

// The gap between the card's rest position and the top of the screen: the card slides out by its own height plus this.
const SLIDE_GAP = 16;
const MAX_WIDTH = 560;
const ICON_TILE = 40;
const ICON_SIZE = 22;

/**
 * A floating Liquid Glass card for a transient notice (ADR 0085). It floats over the content under the status bar and
 * never pushes the layout down, so a native tab bar cannot cover it.
 *
 * It springs down from above when shown and back up when hidden. It never fades: glass keeps its opacity. Once the
 * slide-out ends the card unmounts, so a hidden notice takes no space in its parent. Under Reduce Motion it shows and
 * hides at once.
 */
export function FloatingNotice({
  visible,
  icon,
  title,
  subtitle,
  action,
  announce = true,
  testID,
}: {
  visible: boolean;
  icon: IconName;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void; accessibilityHint?: string };
  announce?: boolean;
  testID: string;
}) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  // Shown while open or sliding out; `gone` is set when a slide-out ends, and cleared on the next show.
  const [gone, setGone] = useState(!visible);
  if (visible && gone) setGone(false);
  const onExited = useCallback(() => setGone(true), []);
  const rendered = visible || (!gone && !reduceMotion);

  const progress = useSharedValue(visible ? 1 : 0);
  // The card's height plus the gap: how far it sits above its rest position while closed.
  const travel = useSharedValue(0);
  const target = visible ? 1 : 0;

  useEffect(() => {
    if (reduceMotion) {
      progress.value = target;
      return;
    }
    progress.value = withSpring(target, spring(), (finished) => {
      if (finished && target === 0) runOnJS(onExited)();
    });
  }, [target, reduceMotion, progress, onExited]);

  useEffect(() => {
    if (visible && announce) AccessibilityInfo.announceForAccessibility(title);
  }, [visible, announce, title]);

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (progress.value - 1) * travel.value }],
  }));

  if (!rendered) return null;

  return (
    <Animated.View
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      onLayout={(event) => {
        travel.value = event.nativeEvent.layout.height + SLIDE_GAP;
      }}
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[{ alignSelf: 'center', maxWidth: MAX_WIDTH, width: '100%' }, slideStyle]}
      testID={testID}
    >
      <GlassSurface
        radius="xl"
        style={{
          alignItems: 'center',
          boxShadow: theme.shadows.glass,
          flexDirection: 'row',
          gap: theme.space[3],
          minHeight: 64,
          overflow: 'hidden',
          paddingHorizontal: theme.space[3],
          paddingVertical: theme.space[3],
        }}
        testID={`${testID}-surface`}
      >
        <View
          style={{
            alignItems: 'center',
            backgroundColor: theme.colors.glassSelected,
            borderRadius: theme.radius.md,
            height: ICON_TILE,
            justifyContent: 'center',
            width: ICON_TILE,
          }}
        >
          <Icon color={theme.colors.brand} name={icon} size={ICON_SIZE} testID={`${testID}-icon`} />
        </View>
        <View
          accessibilityLabel={subtitle === undefined ? title : `${title}. ${subtitle}`}
          accessibilityLiveRegion="polite"
          accessibilityRole="text"
          accessible
          style={{ flex: 1, gap: theme.space[1] }}
        >
          <UiText tone="ink" variant="subhead" weight={600}>
            {title}
          </UiText>
          {subtitle === undefined ? null : (
            <UiText tone="muted" variant="caption">
              {subtitle}
            </UiText>
          )}
        </View>
        {action === undefined ? null : (
          <Button
            accessibilityHint={action.accessibilityHint}
            label={action.label}
            onPress={action.onPress}
            size="small"
            testID={`${testID}-update`}
            variant="primary"
          />
        )}
      </GlassSurface>
    </Animated.View>
  );
}
