import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { spring, useTheme } from '@/core/theme';
import { MiniPlayerChevron } from '@/features/audio/components/MiniPlayerChevron';
import { collapseMotion } from '@/features/audio/components/ReaderMiniBar';
import { shouldCollapse } from '@/features/reader/mini-bar-release';
import { GlassSurface } from '@/shared/ui';

import { eventCountText, focusTitle, stageName } from '../format';
import { stepFocus, type MilestoneMark } from '../logic';
import type { SeerahFocus } from '../types';

import { TimelineHeader } from './TimelineHeader';
import { TimelineScrubber } from './TimelineScrubber';
import type { TimelineOrientation } from './timeline-axis';
import { UnspecifiedChip } from './UnspecifiedChip';

/** The card's height (frame SeerahMapRegion): a drag down past half of it, or a flick, hides the timeline. */
const CARD_HEIGHT = 136;

/**
 * The Seerah timeline (frames SeerahTimeline, SeerahExpanded): the Prophet's age 0 to 63 as one axis, with the four
 * life-stage bands, the milestone marks, a histogram of events, the step arrows, the «الكل» chip and the «غير محدد»
 * bucket. `horizontal` is the compact and medium bar docked under the map; `vertical` is the expanded window's bar on the
 * start side. Dragging sets the focus age; the map and list dim what does not match. Nothing is localised here: the text
 * is the i18n keys under `seerah.timeline`.
 */
export function TimelineBar({
  orientation = 'horizontal',
  focus,
  onFocusChange,
  counts,
  unspecifiedCount,
  totalCount,
  milestones,
  onCollapse,
  testID = 'timeline-bar',
}: {
  orientation?: TimelineOrientation;
  focus: SeerahFocus;
  onFocusChange: (focus: SeerahFocus) => void;
  /** Events per age, 64 entries. */
  counts: readonly number[];
  unspecifiedCount: number;
  totalCount: number;
  milestones: readonly MilestoneMark[];
  /**
   * The timeline can be hidden to its capsule, like the reader's mini bar (developer, 26 Nov 2026): the ⌄ hint at the top
   * centre, a drag down on the title row (not the scrubber), and the title's «hide» action. Called once the card is away.
   */
  onCollapse?: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const windowHeight = useWindowDimensions().height;
  const reduceMotion = useReducedMotion();
  const config = spring();
  const dragY = useSharedValue(0);
  const horizontal = orientation === 'horizontal';
  const age = typeof focus === 'number' ? focus : null;

  const collapse = () => {
    if (onCollapse !== undefined) {
      collapseMotion(dragY, windowHeight, config, reduceMotion, onCollapse);
    }
  };
  const pan = usePanGesture({
    activeOffsetY: [-10, 10],
    failOffsetX: [-20, 20],
    onUpdate: (event) => {
      'worklet';
      dragY.value = Math.max(0, event.translationY);
    },
    onDeactivate: (event) => {
      'worklet';
      if (onCollapse !== undefined && shouldCollapse(event.translationY, event.velocityY, CARD_HEIGHT)) {
        collapseMotion(dragY, windowHeight, config, reduceMotion, onCollapse);
        return;
      }
      dragY.value = withSpring(0, config);
    },
  });
  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateY: dragY.value }] }));
  const draggable = (node: ReactNode) =>
    onCollapse === undefined ? (
      node
    ) : (
      <GestureDetector gesture={pan}>
        <View testID={`${testID}-drag-strip`}>{node}</View>
      </GestureDetector>
    );

  const title = focusTitle(t, focus);
  const labelled = milestones.map((mark) => ({
    ...mark,
    labelAr: t(`seerah.timeline.milestones.${mark.key}` as 'seerah.timeline.milestones.birth', { defaultValue: mark.labelAr }),
  }));
  // Frame SeerahMapRegionYear: «الكهولة · الهجرة · ٩ أحداث», the milestone named when the age has one.
  const milestone = age === null ? undefined : labelled.find((mark) => mark.age === age);
  const subtitle =
    age !== null
      ? milestone !== undefined
        ? t('seerah.timeline.subtitleMilestone', { stage: stageName(t, age) ?? '', milestone: milestone.labelAr, events: eventCountText(t, counts[age] ?? 0) })
        : t('seerah.timeline.subtitle', { stage: stageName(t, age) ?? '', events: eventCountText(t, counts[age] ?? 0) })
      : focus === 'unspecified'
        ? t('seerah.timeline.unspecifiedSubtitle', { events: eventCountText(t, unspecifiedCount) })
        : t('seerah.timeline.hint', { events: eventCountText(t, totalCount) });

  return (
    <Animated.View style={[horizontal ? null : { flex: 1 }, dragStyle]} testID={`${testID}-card`}>
      <GlassSurface
          colorScheme={theme.name === 'dark' ? 'dark' : 'light'} radius="xl" style={horizontal ? undefined : { flex: 1 }} testID={testID}>
        {onCollapse === undefined ? null : <MiniPlayerChevron />}
        {/* Frame SeerahMapRegion: 6 pt above, 8 around, 2 between the title row and the slider. */}
        <View style={[{ gap: horizontal ? 2 : theme.space[1], padding: theme.space[2], paddingTop: horizontal ? 6 : theme.space[2] }, horizontal ? null : { flex: 1 }]}>
          {draggable(
            <TimelineHeader
              onCollapse={onCollapse === undefined ? undefined : collapse}
              onClear={() => onFocusChange(null)}
              onNext={() => onFocusChange(stepFocus(focus, 1))}
              onPrevious={() => onFocusChange(stepFocus(focus, -1))}
              orientation={orientation}
              showClear={focus !== null}
              subtitle={subtitle}
              testID={`${testID}-header`}
              title={title}
            />,
          )}
          <View style={[{ flexDirection: horizontal ? 'row' : 'column', gap: horizontal ? 10 : theme.space[2] }, horizontal ? { marginEnd: 6, marginStart: 14 } : { flex: 1 }]}>
            <View style={[horizontal ? { flex: 1 } : { flex: 1, marginHorizontal: theme.space[3] }]}>
              <TimelineScrubber
                age={age}
                counts={counts}
                milestones={labelled}
                onAgeChange={onFocusChange}
                orientation={orientation}
                testID={`${testID}-scrubber`}
              />
            </View>
            <UnspecifiedChip
              accessibilityLabel={t('seerah.timeline.unspecifiedLabel', { events: eventCountText(t, unspecifiedCount) })}
              count={unspecifiedCount}
              dimmed={age !== null}
              label={t('seerah.timeline.unspecified')}
              onPress={() => onFocusChange(focus === 'unspecified' ? null : 'unspecified')}
              selected={focus === 'unspecified'}
              testID={`${testID}-unspecified`}
            />
          </View>
        </View>
      </GlassSurface>
    </Animated.View>
  );
}
