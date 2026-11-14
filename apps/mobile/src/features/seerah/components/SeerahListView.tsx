import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View, type LayoutChangeEvent, type ScrollViewInstance } from 'react-native';

import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { BackButton, ScreenHeader } from '@/shared/ui';

import { ageText, eventCountText, stageRangeText } from '../format';
import { groupEventsForList } from '../logic';
import type { SeerahEvent } from '../types';

import { EventListCard, type EventListItem } from './EventListCard';
import { ListSectionHeader } from './ListSectionHeader';
import { ListToggle } from './ListToggle';
import { StageChips, type StageChoice } from './StageChips';

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
  const scroller = useRef<ScrollViewInstance>(null);
  const [offsets, setOffsets] = useState<Partial<Record<StageChoice, number>>>({});
  const [selected, setSelected] = useState<StageChoice | null>(null);
  const groups = useMemo(() => groupEventsForList(events), [events]);

  const choices = useMemo<StageChoice[]>(
    () => [...groups.stages.map((section) => section.stage), ...(groups.unspecified.length > 0 ? (['unspecified'] as const) : [])],
    [groups],
  );

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
    setSelected(choice);
    scroller.current?.scrollTo({ animated: true, y: Math.max(0, (offsets[choice] ?? 0) - theme.space[2]) });
  };

  return (
    <View style={{ flex: 1 }} testID={testID}>
      <ContentColumn>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[2], paddingTop: theme.space[2] }}>
          <BackButton onPress={onBack} testID={`${testID}-back`} />
          <View style={{ flex: 1 }}>
            <ScreenHeader title={t('seerah.title')} />
          </View>
          <ListToggle onToggle={onToggleView} testID={`${testID}-toggle`} view="list" />
        </View>
        <View style={{ paddingTop: theme.space[2] }}>
          <StageChips choices={choices} onSelect={select} selected={selected} />
        </View>
      </ContentColumn>
      <ScrollView contentContainerStyle={{ paddingBottom: theme.space[8] }} ref={scroller} testID={`${testID}-scroll`}>
        <ContentColumn>
          <View style={{ gap: theme.space[3], paddingTop: theme.space[3] }}>
            {groups.stages.map((section) => (
              <View key={section.stage} onLayout={mark(section.stage)} style={{ gap: theme.space[3] }}>
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
              <View onLayout={mark('unspecified')} style={{ gap: theme.space[3] }}>
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
