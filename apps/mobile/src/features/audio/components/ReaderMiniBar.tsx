import { useTranslation } from 'react-i18next';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { spring, useTheme } from '@/core/theme';
import { GlassSurface, UiText } from '@/shared/ui';

import { shouldCollapse } from '@/features/reader/mini-bar-release';
import { useMiniEnter } from '../hooks/useMiniEnter';
import { MINI_PLAYER_GAP, MINI_PLAYER_BUTTON_SIZE, MINI_PLAYER_GLYPH_SIZE, MINI_PLAYER_METRICS } from '../mini-player-metrics';
import { reciterInitial } from '../player-view';
import { MiniPlayerChevron } from './MiniPlayerChevron';
import { MiniPlayerProgressLine } from './MiniPlayerProgressLine';
import { MiniPlayerTile } from './MiniPlayerTile';
import { PlayerIconButton } from './PlayerIconButton';
import { PAUSE_ICON, PLAY_ICON } from './player-icons';

// Slides the bar down out of the reader and calls `onCollapse` once it is off screen. Under Reduce Motion there is
// no slide: the bar switches at once, and only its content fades in on the capsule.
function collapseMotion(
  dragY: SharedValue<number>,
  travel: number,
  config: ReturnType<typeof spring>,
  reduceMotion: boolean,
  onCollapse: () => void,
) {
  'worklet';
  if (reduceMotion) {
    dragY.value = 0;
    scheduleOnRN(onCollapse);
    return;
  }
  dragY.value = withSpring(travel, config, (finished) => {
    'worklet';
    if (finished) {
      scheduleOnRN(onCollapse);
    }
  });
}

// The reader's mini bar (#Reading, #ReadingMiniIdle): the glass bar with its chevron, the tile, the name and the
// subtitle, and the play button. Dragged down, it follows the finger and collapses past half its height or on a
// fast flick (mini-bar-release.ts). Idle, it has no progress line and the button starts playback.
export function ReaderMiniBar({
  idle,
  reciterName,
  subtitle,
  playing,
  starting = false,
  fraction,
  onOpen,
  onToggle,
  onCollapse,
}: {
  idle: boolean;
  reciterName: string;
  subtitle: string;
  playing: boolean;
  /** Audio is starting: the button shows pause with the buffering ring. */
  starting?: boolean;
  fraction: number;
  onOpen: () => void;
  onToggle: () => void;
  onCollapse: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const windowHeight = useWindowDimensions().height;
  const enter = useMiniEnter();
  const dragY = useSharedValue(0);
  const config = spring();
  const reduceMotion = useReducedMotion();
  const metrics = MINI_PLAYER_METRICS.reader;

  const pan = usePanGesture({
    activeOffsetY: [-10, 10],
    failOffsetX: [-20, 20],
    onUpdate: (event) => {
      'worklet';
      dragY.value = Math.max(0, event.translationY);
    },
    onDeactivate: (event) => {
      'worklet';
      if (shouldCollapse(event.translationY, event.velocityY, metrics.height)) {
        collapseMotion(dragY, windowHeight, config, reduceMotion, onCollapse);
        return;
      }
      dragY.value = withSpring(0, config);
    },
  });
  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateY: dragY.value }] }));

  return (
    <Animated.View style={[{ width: '100%' }, enter.container]}>
      <GestureDetector gesture={pan}>
        <Animated.View style={dragStyle}>
          <GlassSurface
            radius="lg"
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              gap: MINI_PLAYER_GAP,
              height: metrics.height,
              overflow: 'hidden',
              paddingEnd: metrics.paddingEnd,
              paddingStart: metrics.paddingStart,
            }}
            testID="mini-player-reader"
          >
            {idle ? null : <MiniPlayerProgressLine fraction={fraction} />}
            <MiniPlayerChevron />
            <Animated.View
              style={[{ alignItems: 'center', flex: 1, flexDirection: 'row', gap: MINI_PLAYER_GAP, height: '100%', minWidth: 0 }, enter.content]}
            >
              <Pressable
                accessibilityActions={[
                  // Only collapse: the open bar can't expand further; the capsule is the expand control.
                  { label: t('player.minimize'), name: 'collapse' },
                ]}
                accessibilityHint={t('player.mini.hint')}
                accessibilityLabel={t('player.mini.label', { reciter: reciterName, surah: subtitle })}
                accessibilityRole="button"
                onAccessibilityAction={(event) => {
                  if (event.nativeEvent.actionName === 'collapse') {
                    collapseMotion(dragY, windowHeight, config, reduceMotion, onCollapse);
                  }
                }}
                onPress={onOpen}
                style={{ alignItems: 'center', flex: 1, flexDirection: 'row', gap: MINI_PLAYER_GAP, height: '100%', minWidth: 0 }}
                testID="mini-player-open"
              >
                <MiniPlayerTile glyph={metrics.tileGlyph} letter={reciterInitial(reciterName)} radius={metrics.tileRadius} size={metrics.tileSize} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <UiText numberOfLines={1} scale="bar" variant={metrics.title.variant} weight={metrics.title.weight}>
                    {reciterName}
                  </UiText>
                  <UiText numberOfLines={1} scale="bar" tone="muted" variant={metrics.subtitle.variant} weight={metrics.subtitle.weight}>
                    {subtitle}
                  </UiText>
                </View>
              </Pressable>
              <PlayerIconButton
                background={theme.colors.brand}
                glyphColor={theme.colors.onBrand}
                glyphSize={MINI_PLAYER_GLYPH_SIZE}
                hitSize={MINI_PLAYER_BUTTON_SIZE}
                icon={playing || starting ? PAUSE_ICON : PLAY_ICON}
                label={playing || starting ? t('player.pause') : t('player.play')}
                onPress={onToggle}
                starting={starting}
                testID="mini-player-toggle"
              />
            </Animated.View>
          </GlassSurface>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
