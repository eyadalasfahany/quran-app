import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';

import { ContentColumn } from '@/core/layout';
import { CONTENT_COLUMN_MAX_WIDTH } from '@/core/layout/ContentColumn';
import { useScreenInsets } from '@/core/layout/useScreenInsets';
import { useTheme } from '@/core/theme';
import { BackButton, ScreenHeader } from '@/shared/ui';

import { ageText, eventCountText, stageRangeText } from '../format';
import { groupEventsForList } from '../logic';
import type { SeerahEvent } from '../types';

import { EventListCard, type EventListItem } from './EventListCard';
import { ListSectionHeader } from './ListSectionHeader';
import { ListToggle } from './ListToggle';
import { StageChips, type StageChoice } from './StageChips';

/** The last section whose top is at or above `y` (scroll-content coordinates); the first when none is. */
function sectionAt(choices: readonly StageChoice[], offsets: Partial<Record<StageChoice, number>>, y: number): StageChoice | null {
  let current: StageChoice | null = choices[0] ?? null;
  for (const choice of choices) {
    const top = offsets[choice];
    if (top !== undefined && top <= y) {
      current = choice;
    }
  }
  return current;
}

/**
 * «عرض كقائمة» (frames SeerahList, SeerahListDark, SeerahListEnglish): every event once, grouped by life stage and then by
 * age, with «غير محدد» last. The period chips jump to a stage. Book headings and place names stay Arabic. It is the
 * screen-reader alternative to the map: the same data, in reading order, and each row opens the same event page.
 */
export function SeerahListView({
  events,
  placeName,
  onOpen,
  onBack,
  onToggleView,
  testID = 'seerah-list',
}: {
  events: readonly SeerahEvent[];
  placeName: (placeId: string) => string;
  onOpen: (id: string) => void;
  onBack: () => void;
  onToggleView: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useScreenInsets();
  const scroller = useRef<ScrollViewInstance>(null);
  const [offsets, setOffsets] = useState<Partial<Record<StageChoice, number>>>({});
  const groups = useMemo(() => groupEventsForList(events), [events]);

  const choices = useMemo<StageChoice[]>(
    () => [...groups.stages.map((section) => section.stage), ...(groups.unspecified.length > 0 ? (['unspecified'] as const) : [])],
    [groups],
  );
  // The chip of the section at the top of the list (frame SeerahList): the first stage until the list scrolls.
  const [picked, setPicked] = useState<StageChoice | null>(null);
  const selected = picked ?? choices[0] ?? null;
  // While a chip's tap scrolls the list, the sections it passes do not take the selection.
  const scrollingTo = useRef<number | null>(null);

  const row = useCallback(
    (event: SeerahEvent, withAge: boolean): EventListItem => ({
      id: event.id,
      subtitle: withAge ? placeName(event.placeId) : t('seerah.list.rowUnspecified', { place: placeName(event.placeId) }),
      title: event.titleAr,
    }),
    [placeName, t],
  );

  const mark = (key: StageChoice) => (layout: LayoutChangeEvent) => {
    const y = layout.nativeEvent.layout.y;
    setOffsets((previous) => (previous[key] === y ? previous : { ...previous, [key]: y }));
  };

  const select = (choice: StageChoice) => {
    setPicked(choice);
    const y = Math.max(0, (offsets[choice] ?? 0) - theme.space[2]);
    scrollingTo.current = y;
    scroller.current?.scrollTo({ animated: true, y });
  };

  const follow = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    if (scrollingTo.current !== null) {
      if (Math.abs(y - scrollingTo.current) > 1) {
        return;
      }
      scrollingTo.current = null;
    }
    const current = sectionAt(choices, offsets, y + theme.space[3]);
    if (current !== null && current !== selected) {
      setPicked(current);
    }
  };
  const release = () => {
    scrollingTo.current = null;
  };

  return (
    <View style={{ flex: 1 }} testID={testID}>
      {/* The header sits in the flow above the scroller, on the page surface: nothing scrolls under it or covers it. */}
      <View
        style={{ backgroundColor: theme.colors.surface, paddingBottom: theme.space[2], paddingTop: insets.top, zIndex: 1 }}
        testID={`${testID}-header`}
      >
        {/* Not ContentColumn: its flex: 1 collapses to zero height in this auto-height header, and the buttons spill into the status bar. */}
        <View style={{ alignSelf: 'center', maxWidth: CONTENT_COLUMN_MAX_WIDTH, paddingHorizontal: theme.space[4], width: '100%' }}>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[2], paddingTop: theme.space[2] }}>
            <BackButton onPress={onBack} testID={`${testID}-back`} />
            <View style={{ flex: 1 }}>
              <ScreenHeader title={t('seerah.title')} />
            </View>
            <ListToggle onToggle={onToggleView} testID={`${testID}-toggle`} view="list" />
          </View>
        </View>
        {/* Frame SeerahList: the chip row runs edge to edge, its first chip at the 16 pt start inset, 10 pt under the title. */}
        <View style={{ alignSelf: 'center', maxWidth: CONTENT_COLUMN_MAX_WIDTH, paddingTop: 10, width: '100%' }}>
          <StageChips choices={choices} onSelect={select} selected={selected} />
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.space[8] }}
        onMomentumScrollEnd={release}
        onScroll={follow}
        onScrollBeginDrag={release}
        ref={scroller}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
        testID={`${testID}-scroll`}
      >
        <ContentColumn gutter={theme.space[4]}>
          <View style={{ gap: theme.space[3], paddingTop: theme.space[3] }}>
            {groups.stages.map((section) => (
              <View key={section.stage} onLayout={mark(section.stage)} style={{ gap: theme.space[3] }} testID={`${testID}-section-${section.stage}`}>
                <ListSectionHeader
                  detail={stageRangeText(t, section.from, section.to)}
                  testID={`${testID}-stage-${section.stage}`}
                  title={t(`seerah.stages.${section.stage}`)}
                  variant="stage"
                />
                {section.ages.map((group) => (
                  <View key={group.age} style={{ gap: theme.space[2] }}>
                    <ListSectionHeader title={ageText(t, group.age)} variant="age" />
                    <EventListCard onRowPress={onOpen} rows={group.events.map((event) => row(event, true))} />
                  </View>
                ))}
              </View>
            ))}
            {groups.unspecified.length > 0 ? (
              <View onLayout={mark('unspecified')} style={{ gap: theme.space[3] }} testID={`${testID}-section-unspecified`}>
                <ListSectionHeader
                  detail={eventCountText(t, groups.unspecified.length)}
                  note={t('seerah.list.unspecifiedNote')}
                  testID={`${testID}-unspecified`}
                  title={t('seerah.age.bucket')}
                  variant="unspecified"
                />
                <EventListCard dashed onRowPress={onOpen} rows={groups.unspecified.map((event) => row(event, false))} />
              </View>
            ) : null}
          </View>
        </ContentColumn>
      </ScrollView>
    </View>
  );
}
