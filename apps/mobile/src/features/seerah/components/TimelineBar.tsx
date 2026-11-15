import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { GlassSurface } from '@/shared/ui';

import { ageText, eventCountText, stageName } from '../format';
import { stepFocus, type MilestoneMark } from '../logic';
import type { SeerahFocus } from '../types';

import { TimelineHeader } from './TimelineHeader';
import { TimelineScrubber } from './TimelineScrubber';
import type { TimelineOrientation } from './timeline-axis';
import { UnspecifiedChip } from './UnspecifiedChip';

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
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const horizontal = orientation === 'horizontal';
  const age = typeof focus === 'number' ? focus : null;

  const title =
    age !== null ? ageText(t, age) : focus === 'unspecified' ? t('seerah.age.unspecifiedTitle') : t('seerah.age.all');
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
    <GlassSurface
        colorScheme={theme.name === 'dark' ? 'dark' : 'light'} radius="xl" style={horizontal ? undefined : { flex: 1 }} testID={testID}>
      {/* Frame SeerahMapRegion: 6 pt above, 8 around, 2 between the title row and the slider. */}
      <View style={[{ gap: horizontal ? 2 : theme.space[1], padding: theme.space[2], paddingTop: horizontal ? 6 : theme.space[2] }, horizontal ? null : { flex: 1 }]}>
        <TimelineHeader
          onClear={() => onFocusChange(null)}
          onNext={() => onFocusChange(stepFocus(focus, 1))}
          onPrevious={() => onFocusChange(stepFocus(focus, -1))}
          orientation={orientation}
          showClear={focus !== null}
          subtitle={subtitle}
          testID={`${testID}-header`}
          title={title}
        />
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
  );
}
