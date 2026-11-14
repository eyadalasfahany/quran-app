import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, I18nManager, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '@/core/theme';
import { Icon, useContrastColors } from '@/shared/ui';

import { ageText, eventCountText, stageName } from '../format';
import { AGE_MAX, AGE_MIN, ageToFraction, fractionToAge, histogramHeights, stageOfAge, stepFocus, type MilestoneMark as Mark } from '../logic';

import { MilestoneMark } from './MilestoneMark';
import { StageBands } from './StageBands';
import { alongStart, fractionOfTouch, type TimelineOrientation } from './timeline-axis';
import { YearChip } from './YearChip';
import { YearHistogram } from './YearHistogram';

const HANDLE = 30;
const IDLE_GLYPH = { ios: 'arrow.left.and.right', android: 'swap_horiz' } as const;

// The cross-axis lanes (top offsets on the horizontal bar, start offsets on the vertical one), in points.
const LANES = {
  horizontal: { labels: 0, histogram: 20, track: 66, bands: 76, length: 108 },
  vertical: { labels: 0, histogram: 62, track: 108, bands: 116, length: 190 },
} as const;

/**
 * The axis of the timeline: a histogram of events per age over a track, the four life-stage bands, the milestone marks
 * and the handle. Touching or dragging picks an age (age 0 at the start edge, mirrored in Arabic). It is one
 * `adjustable` element: increment and decrement move by one year and announce the year's event count. The visual parts
 * are hidden from screen readers.
 */
export function TimelineScrubber({
  orientation = 'horizontal',
  age,
  counts,
  milestones,
  onAgeChange,
  testID,
}: {
  orientation?: TimelineOrientation;
  /** The selected age, or null (all ages, or the unspecified bucket): the handle rests idle at the start. */
  age: number | null;
  /** Events per age, 64 entries. */
  counts: readonly number[];
  milestones: readonly Mark[];
  onAgeChange: (age: number) => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const [length, setLength] = useState(0);
  const [dragging, setDragging] = useState(false);
  const horizontal = orientation === 'horizontal';
  const lanes = LANES[orientation];
  const rtl = I18nManager.isRTL;
  const heights = histogramHeights(counts);
  const handleAge = age ?? AGE_MIN;
  const stage = age === null ? null : stageOfAge(age);

  const valueText = (value: number | null) =>
    value === null
      ? t('seerah.age.all')
      : t('seerah.timeline.value', { age: ageText(t, value), events: eventCountText(t, counts[value] ?? 0) });

  const pick = (offset: number) => {
    'worklet';
    scheduleOnRN(onAgeChange, fractionToAge(fractionOfTouch(orientation, offset, length, rtl)));
  };

  const pan = usePanGesture({
    minDistance: 0,
    onActivate: (event) => {
      'worklet';
      scheduleOnRN(setDragging, true);
      pick(horizontal ? event.x : event.y);
    },
    onUpdate: (event) => {
      'worklet';
      pick(horizontal ? event.x : event.y);
    },
    onFinalize: () => {
      'worklet';
      scheduleOnRN(setDragging, false);
    },
  });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLength(horizontal ? width : height);
  };

  const step = (direction: 1 | -1) => {
    const next = stepFocus(age, direction);
    if (typeof next === 'number') {
      onAgeChange(next);
      AccessibilityInfo.announceForAccessibility(valueText(next));
    }
  };

  const lane = (key: 'labels' | 'histogram' | 'bands', extent: number) =>
    horizontal
      ? ({ height: extent, start: 0, end: 0, position: 'absolute', top: lanes[key] } as const)
      : ({ width: extent, top: 0, bottom: 0, position: 'absolute', start: lanes[key] } as const);

  const handleAnchor = horizontal ? { top: lanes.track - HANDLE / 2 + 1, marginStart: -HANDLE / 2 } : { start: lanes.track - HANDLE / 2 + 1, marginTop: -HANDLE / 2 };

  return (
    <GestureDetector gesture={pan}>
      <View
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        accessibilityHint={t('seerah.timeline.group', { from: AGE_MIN, to: AGE_MAX })}
        accessibilityLabel={t('seerah.timeline.handle')}
        accessibilityRole="adjustable"
        accessibilityValue={{ max: AGE_MAX, min: AGE_MIN, now: age ?? undefined, text: valueText(age) }}
        accessible
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment') {
            step(1);
          } else if (event.nativeEvent.actionName === 'decrement') {
            step(-1);
          }
        }}
        onLayout={onLayout}
        style={horizontal ? { height: lanes.length } : { flex: 1, minHeight: lanes.length }}
        testID={testID}
      >
        <View pointerEvents="none" style={lane('labels', horizontal ? 18 : 56)}>
          {milestones.map((mark) => (
            <View
              key={mark.key}
              style={[{ position: 'absolute', width: 56 }, alongStart(orientation, ageToFraction(mark.age)), horizontal ? { marginStart: -28 } : { marginTop: -8 }]}
            >
              <MilestoneMark label={mark.labelAr} part="label" testID={testID ? `${testID}-label-${mark.key}` : undefined} />
            </View>
          ))}
        </View>
        <View pointerEvents="none" style={lane('histogram', horizontal ? 40 : 40)}>
          <YearHistogram focusAge={age} heights={heights} orientation={orientation} />
        </View>
        <View
          pointerEvents="none"
          style={[
            { backgroundColor: colors.lineStrong, position: 'absolute' },
            horizontal ? { end: 0, height: 2, start: 0, top: lanes.track } : { bottom: 0, start: lanes.track, top: 0, width: 2 },
          ]}
        />
        <View pointerEvents="none" style={[{ position: 'absolute' }, horizontal ? { end: 0, height: 12, start: 0, top: lanes.track - 5 } : { bottom: 0, top: 0, width: 12, start: lanes.track - 5 }]}>
          {milestones.map((mark) => (
            <View
              key={mark.key}
              style={[{ position: 'absolute' }, alongStart(orientation, ageToFraction(mark.age)), horizontal ? { marginStart: -5 } : { marginTop: -5 }]}
            >
              <MilestoneMark label={mark.labelAr} part="diamond" testID={testID ? `${testID}-diamond-${mark.key}` : undefined} />
            </View>
          ))}
        </View>
        <View pointerEvents="none" style={lane('bands', horizontal ? 28 : 80)}>
          <StageBands activeStage={stage?.key ?? null} orientation={orientation} />
        </View>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={[{ position: 'absolute' }, alongStart(orientation, ageToFraction(handleAge)), handleAnchor]}
        >
          <View
            style={{
              alignItems: 'center',
              backgroundColor: age === null ? theme.colors.surfaceRaised : theme.colors.brand,
              borderColor: theme.colors.brand,
              borderRadius: HANDLE / 2,
              borderWidth: age === null ? theme.stroke.selectedRing : theme.size.selectedRingGap,
              height: HANDLE,
              justifyContent: 'center',
              width: HANDLE,
            }}
            testID={testID ? `${testID}-handle` : undefined}
          >
            {age === null ? <Icon color={theme.colors.brand} name={IDLE_GLYPH} size={theme.size.iconSm - 4} /> : null}
          </View>
          {dragging && age !== null ? (
            <View style={[{ position: 'absolute' }, horizontal ? { bottom: HANDLE + 6, start: -(36 - HANDLE / 2) } : { end: HANDLE + 6, top: -12 }]}>
              <YearChip age={age} stageName={stageName(t, age)} testID={testID ? `${testID}-chip` : undefined} />
            </View>
          ) : null}
        </View>
      </View>
    </GestureDetector>
  );
}
