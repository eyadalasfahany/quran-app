import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, I18nManager, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '@/core/theme';
import { useContrastColors } from '@/shared/ui';

import { ageText, eventCountText, stageName } from '../format';
import { AGE_COUNT, AGE_MAX, AGE_MIN, ageToFraction, fractionToAge, histogramHeights, stageOfAge, stepFocus, type MilestoneMark as Mark } from '../logic';

import { MilestoneMark } from './MilestoneMark';
import { StageBands } from './StageBands';
import { alongStart, fractionOfTouch, type TimelineOrientation } from './timeline-axis';
import { YearChip } from './YearChip';
import { YearHistogram } from './YearHistogram';

// Frames SeerahMapRegion and SeerahMapRegionYear: a 22 pt handle; idle, a raised disc with a 2 pt brand edge and the
// double chevron; selected, a brand disc in a 3 pt raised ring, with a 2 pt brand line from the track up the histogram.
const HANDLE = 22;
const TICK_AGES = [10, 20, 30, 40, 50, 60] as const;

// The cross-axis lanes (top offsets on the horizontal bar, start offsets on the vertical one), in points. Horizontal is the
// frame's 74 pt slider: milestone names at 2, bars standing on 44, the track at 45, the bands at 51 and their names at 59.
const LANES = {
  horizontal: { labels: 2, histogram: 20, histogramExtent: 24, track: 45, bands: 51, bandsExtent: 23, length: 74 },
  vertical: { labels: 0, histogram: 62, histogramExtent: 40, track: 108, bands: 116, bandsExtent: 80, length: 190 },
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

  const ring = age === null ? theme.stroke.selectedRing : theme.size.selectedRingGap;
  const knob = age === null ? HANDLE : HANDLE + 2 * ring;
  const handleAnchor = horizontal ? { top: lanes.track + 1 - knob / 2, marginStart: -knob / 2 } : { start: lanes.track + 1 - knob / 2, marginTop: -knob / 2 };

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
        <View pointerEvents="none" style={lane('labels', horizontal ? 14 : 56)}>
          {milestones.map((mark, index) => {
            // The first name starts at the axis start and the last ends at its end; the rest centre on their mark.
            const edge = !horizontal ? null : index === 0 ? 'start' : index === milestones.length - 1 ? 'end' : null;
            return (
              <View
                key={mark.key}
                style={[
                  { position: 'absolute', width: 60 },
                  edge === 'start' ? { alignItems: 'flex-start', start: 0 } : edge === 'end' ? { alignItems: 'flex-end', end: 0 } : alongStart(orientation, ageToFraction(mark.age)),
                  horizontal ? (edge === null ? { marginStart: -30 } : null) : { marginTop: -8, width: 56 },
                ]}
              >
                <MilestoneMark
                  dimmed={age !== null && mark.age !== age}
                  label={mark.labelAr}
                  part="label"
                  selected={age !== null && mark.age === age}
                  testID={testID ? `${testID}-label-${mark.key}` : undefined}
                />
              </View>
            );
          })}
        </View>
        <View pointerEvents="none" style={lane('histogram', lanes.histogramExtent)}>
          <YearHistogram focusAge={age} heights={heights} orientation={orientation} thickness={horizontal ? 23 : 36} />
        </View>
        <View
          pointerEvents="none"
          style={[
            { backgroundColor: colors.lineStrong, position: 'absolute' },
            horizontal ? { end: 0, height: 2, start: 0, top: lanes.track } : { bottom: 0, start: lanes.track, top: 0, width: 2 },
          ]}
        />
        {horizontal
          ? TICK_AGES.map((tick) => (
              <View
                key={tick}
                pointerEvents="none"
                style={[{ backgroundColor: colors.inkMuted, height: 4, marginStart: -0.5, opacity: 0.6, position: 'absolute', top: lanes.track + 1, width: 1 }, alongStart(orientation, tick / AGE_COUNT)]}
                testID={testID ? `${testID}-tick-${tick}` : undefined}
              />
            ))
          : null}
        {age !== null && horizontal ? (
          <View
            pointerEvents="none"
            style={[{ backgroundColor: theme.colors.brand, borderRadius: 1, height: 30, marginStart: -1, position: 'absolute', top: lanes.track + 2 - 30, width: 2 }, alongStart(orientation, ageToFraction(age))]}
            testID={testID ? `${testID}-line` : undefined}
          />
        ) : null}
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
        <View pointerEvents="none" style={lane('bands', lanes.bandsExtent)}>
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
              borderColor: age === null ? theme.colors.brand : theme.colors.surfaceRaised,
              borderRadius: knob / 2,
              borderWidth: ring,
              boxShadow: `0 1px 3px ${theme.colors.coverShadow}`,
              height: knob,
              justifyContent: 'center',
              width: knob,
            }}
            testID={testID ? `${testID}-handle` : undefined}
          >
            {age === null ? (
              <Svg fill="none" height={12} testID={testID ? `${testID}-handle-glyph` : undefined} viewBox="0 0 12 12" width={12}>
                <Path d="M4 3.5L1.5 6 4 8.5M8 3.5L10.5 6 8 8.5" stroke={theme.colors.brand} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} />
              </Svg>
            ) : null}
          </View>
          {dragging && age !== null ? (
            <View style={[{ position: 'absolute' }, horizontal ? { bottom: knob + 6, start: -(36 - knob / 2) } : { end: knob + 6, top: -12 }]}>
              <YearChip age={age} stageName={stageName(t, age)} testID={testID ? `${testID}-chip` : undefined} />
            </View>
          ) : null}
        </View>
      </View>
    </GestureDetector>
  );
}
