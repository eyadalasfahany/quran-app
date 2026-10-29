import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '@/core/theme';
import { GlassSurface } from '@/shared/ui';

import { shouldExpand } from '@/features/reader/mini-bar-release';
import { MINI_PLAYER_CAPSULE, MINI_PLAYER_METRICS } from '../mini-player-metrics';
import { useMiniEnter } from '../hooks/useMiniEnter';
import { MiniPlayerProgressLine } from './MiniPlayerProgressLine';

// The collapsed reader bar (#ReadingMiniCollapsed): a 64 × 24 glass pill with a 28 × 4 grabber, centred in its
// 88 × 44 hit area. While playing, the gold line runs along its top. A tap expands it, and so does a drag up.
export function MiniPlayerCapsule({
  fraction,
  showProgress,
  onExpand,
}: {
  fraction: number;
  showProgress: boolean;
  onExpand: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const enter = useMiniEnter();
  const pan = usePanGesture({
    activeOffsetY: [-10, 10],
    failOffsetX: [-20, 20],
    onDeactivate: (event) => {
      'worklet';
      if (shouldExpand(event.translationY, event.velocityY, MINI_PLAYER_METRICS.reader.height)) {
        scheduleOnRN(onExpand);
      }
    },
  });

  return (
    <Animated.View style={[{ alignItems: 'center' }, enter.container]} testID="mini-player-capsule-dock">
      <GestureDetector gesture={pan}>
        <Pressable
          accessibilityLabel={t('player.mini.show')}
          accessibilityRole="button"
          onPress={onExpand}
          style={{
            alignItems: 'center',
            height: MINI_PLAYER_CAPSULE.hitHeight,
            justifyContent: 'center',
            width: MINI_PLAYER_CAPSULE.hitWidth,
          }}
          testID="mini-player-capsule"
        >
          <GlassSurface
            radius="pill"
            style={{
              alignItems: 'center',
              height: MINI_PLAYER_CAPSULE.height,
              justifyContent: 'center',
              overflow: 'hidden',
              width: MINI_PLAYER_CAPSULE.width,
            }}
            testID="mini-player-capsule-glass"
          >
            {showProgress ? <MiniPlayerProgressLine fraction={fraction} /> : null}
            <Animated.View style={[{ alignItems: 'center', justifyContent: 'center' }, enter.content]}>
              <View
                style={{
                  backgroundColor: theme.colors.lineStrong,
                  borderRadius: MINI_PLAYER_CAPSULE.grabberHeight / 2,
                  height: MINI_PLAYER_CAPSULE.grabberHeight,
                  width: MINI_PLAYER_CAPSULE.grabberWidth,
                }}
                testID="mini-player-capsule-grabber"
              />
            </Animated.View>
          </GlassSurface>
        </Pressable>
      </GestureDetector>
    </Animated.View>
  );
}
