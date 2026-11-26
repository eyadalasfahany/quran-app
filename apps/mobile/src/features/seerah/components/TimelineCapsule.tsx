import { Pressable } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '@/core/theme';
import { useMiniEnter } from '@/features/audio/hooks/useMiniEnter';
import { MINI_PLAYER_CAPSULE } from '@/features/audio/mini-player-metrics';
import { shouldExpand } from '@/features/reader/mini-bar-release';
import { GlassSurface, UiText } from '@/shared/ui';

/** The timeline card's height (frame SeerahMapRegion): a drag up past half of it expands the timeline, like the mini player. */
const CARD_HEIGHT = 136;

/**
 * The hidden age timeline (developer, 26 Nov 2026, like the reader's collapsed mini player): a glass pill in the bottom
 * trailing corner (the end edge, so left in Arabic) naming the current focus and its events, in a 44 pt hit area. A tap
 * expands the timeline, and so does a drag up. It slides in; under Reduce Motion it doesn't move and its text fades in.
 */
export function TimelineCapsule({
  label,
  accessibilityLabel,
  onExpand,
  testID = 'seerah-timeline-capsule',
}: {
  /** The focus and its events, e.g. «كل الأعمار · ٢١١ حدثًا». */
  label: string;
  accessibilityLabel: string;
  onExpand: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const enter = useMiniEnter();
  const pan = usePanGesture({
    activeOffsetY: [-10, 10],
    failOffsetX: [-20, 20],
    onDeactivate: (event) => {
      'worklet';
      if (shouldExpand(event.translationY, event.velocityY, CARD_HEIGHT)) {
        scheduleOnRN(onExpand);
      }
    },
  });

  return (
    <Animated.View pointerEvents="box-none" style={[{ alignItems: 'flex-end' }, enter.container]} testID={`${testID}-dock`}>
      <GestureDetector gesture={pan}>
        <Pressable
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          onPress={onExpand}
          style={{ justifyContent: 'center', minHeight: MINI_PLAYER_CAPSULE.hitHeight }}
          testID={testID}
        >
          <GlassSurface interactive
            colorScheme={theme.name === 'dark' ? 'dark' : 'light'}
            radius="pill"
            style={{ justifyContent: 'center', minHeight: theme.size.touchTarget - 3 * theme.space[1], paddingHorizontal: theme.space[3] }}
            testID={`${testID}-glass`}
          >
            <Animated.View style={enter.content}>
              <UiText numberOfLines={1} scale="bar" variant="label" weight={600}>
                {label}
              </UiText>
            </Animated.View>
          </GlassSurface>
        </Pressable>
      </GestureDetector>
    </Animated.View>
  );
}
