import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useScreenInsets } from '@/core/layout/useScreenInsets';
import { useWindowClass } from '@/core/layout';
import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { formatPackSizeMb } from '@/features/hadith/format';
import { BackButton, Screen } from '@/shared/ui';

import { seerahArtFor } from '../art/seerah-art';
import { EventCallout } from '../components/EventCallout';
import type { EventListItem } from '../components/EventListCard';
import { MapHeader } from '../components/MapHeader';
import { MapKeyContent } from '../components/MapKeyContent';
import { SeerahBackdrop } from '../components/SeerahBackdrop';
import { SeerahListView } from '../components/SeerahListView';
import { SeerahMap } from '../components/SeerahMap';
import { SeerahSheet } from '../components/SeerahSheet';
import { SeerahStateView, type SeerahStateKind } from '../components/SeerahStateView';
import { SpotSheet } from '../components/SpotSheet';
import { TimelineBar } from '../components/TimelineBar';
import { ageRangeText, ageText, eventCountText } from '../format';
import {
  buildMapPins,
  buildYearIndex,
  dimmedRouteIds,
  eventsOfPin,
  mapTargetForPlace,
  milestoneMarks,
  nearestAgeWithEvents,
  otherCount,
  otherEvents,
  sortByAge,
} from '../logic';
import {
  useSeerahBook,
  useSeerahCatalogEntry,
  useSeerahDownload,
  useSeerahReady,
  useSeerahViewChoice,
  useSeerahWorld,
} from '../hooks';
import { goBackOr, seerahHref } from '../routes';
import type { SeerahEvent, SeerahFocus } from '../types';
import { SeerahEventPane } from './SeerahEventPane';

const REGION = 'region';
const PANEL_WIDTH = 440;
const VERTICAL_TIMELINE_WIDTH = 150;
const TIMELINE_CLEARANCE = 232;

/**
 * The Seerah screen (frames SeerahMapRegion, SeerahMapMakkah, SeerahMapMadinah, SeerahTimeline, SeerahList, SeerahExpanded,
 * SeerahState*): the map with its timeline, or the list, or the card that says why there is none (not downloaded, downloading,
 * offline, failed). Layout follows the window class: compact is the map full-bleed with the timeline at the bottom and the
 * event as a full-screen push; medium opens the event in a bottom sheet; expanded puts the vertical timeline on the start
 * side and the event in a side panel on the end side. Everything it shows comes from content.db: no tap waits on the network.
 */
export function SeerahScreen({
  initialView = null,
  initialAge = null,
  initialPlace = null,
  testID = 'screen-seerah',
}: {
  initialView?: 'map' | 'list' | null;
  initialAge?: number | null;
  initialPlace?: string | null;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const windowClass = useWindowClass();
  const insets = useScreenInsets();
  const ready = useSeerahReady();
  const book = useSeerahBook();
  const catalog = useSeerahCatalogEntry();
  const world = useSeerahWorld();
  const download = useSeerahDownload(catalog);
  const [view, toggleView, chooseView] = useSeerahViewChoice(initialView);

  const [levelId, setLevelId] = useState(REGION);
  const [focus, setFocus] = useState<SeerahFocus>(initialAge);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [focusPlaceId, setFocusPlaceId] = useState<string | null>(null);
  const [callout, setCallout] = useState<SeerahEvent | null>(null);
  const [spot, setSpot] = useState<{ title: string; events: SeerahEvent[] } | null>(null);
  const [keyOpen, setKeyOpen] = useState(false);
  const [openEventId, setOpenEventId] = useState<string | null>(null);
  const [placeApplied, setPlaceApplied] = useState(false);

  const index = useMemo(() => buildYearIndex(world.events), [world.events]);
  const names = useMemo(() => new Map(world.places.map((place) => [place.id, place.nameAr])), [world.places]);
  const placeName = useCallback((id: string) => names.get(id) ?? '', [names]);
  const level = world.levels.find((item) => item.id === levelId) ?? world.levels[0];
  const cityLevels = useMemo(
    () =>
      Object.fromEntries(
        world.levels.flatMap((item) => (item.id !== REGION && item.parentPlaceId !== null ? [[item.parentPlaceId, item.id] as const] : [])),
      ),
    [world.levels],
  );
  const pins = useMemo(
    () =>
      level === undefined
        ? []
        : buildMapPins({ cityLevels, events: world.events, focus, level, placeName: (place) => place.nameAr, places: world.places }),
    [cityLevels, focus, level, world.events, world.places],
  );
  const marks = useMemo(() => milestoneMarks(world.milestones, world.events), [world.milestones, world.events]);
  const dimmedRoutes = useMemo(() => dimmedRouteIds(world.routes, world.events, focus), [world.routes, world.events, focus]);

  // A place from the event page's chip: open its map with its pin selected, once, as soon as the data is there.
  if (!placeApplied && initialPlace !== null && world.levels.length > 0) {
    setPlaceApplied(true);
    const target = mapTargetForPlace(world.levels, world.places, initialPlace);
    if (target !== null) {
      setLevelId(target.levelId);
      setSelectedPlaceId(target.pinPlaceId);
      setFocusPlaceId(target.pinPlaceId);
    }
  }

  const eventRow = (event: SeerahEvent): EventListItem => ({
    id: event.id,
    subtitle: event.ageFrom === null ? t('seerah.age.unspecified') : ageRangeText(t, event.ageFrom, event.ageTo ?? event.ageFrom),
    title: event.titleAr,
  });

  const openEvent = (id: string) => {
    setCallout(null);
    setSpot(null);
    // The list is a full screen: its rows always push the event page, whatever the window.
    if (windowClass === 'compact' || view === 'list') {
      router.push(seerahHref.event(id));
    } else {
      setOpenEventId(id);
    }
  };

  // A row of the spot sheet (a modal): the sheet closes first, and the event opens on the next frame. A push that lands
  // while the modal is still dismissing is dropped on iOS.
  const openFromSpot = (id: string) => {
    setSpot(null);
    requestAnimationFrame(() => openEvent(id));
  };

  const showSpot = (title: string, events: SeerahEvent[]) => {
    setCallout(null);
    setSpot({ events: sortByAge(events), title });
  };

  const onPinPress = (placeId: string) => {
    if (level === undefined) {
      return;
    }
    setSelectedPlaceId(placeId);
    const events = eventsOfPin({ events: world.events, focus, level, placeId, places: world.places });
    if (events.length === 1 && events[0] !== undefined) {
      setCallout(events[0]);
    } else if (events.length > 1) {
      showSpot(placeName(placeId), events);
    }
  };

  const showOnMap = (placeId: string) => {
    const target = mapTargetForPlace(world.levels, world.places, placeId);
    setOpenEventId(null);
    if (target !== null) {
      setLevelId(target.levelId);
      setSelectedPlaceId(target.pinPlaceId);
      setFocusPlaceId(target.pinPlaceId);
    }
    chooseView('map');
  };

  const sizeLabel = catalog === undefined ? undefined : t('ui.download.size', { size: formatPackSizeMb(catalog.packSizeBytes, locale) });
  const doneLabel =
    catalog === undefined || download.view.kind !== 'downloading'
      ? undefined
      : t('ui.download.size', { size: formatPackSizeMb(catalog.packSizeBytes * download.view.progress, locale) });

  if (!ready) {
    return <Screen testID={testID} topInset={false} />;
  }

  const backToMenu = () => goBackOr(seerahHref.menuTab);
  const stateScreen = (kind: SeerahStateKind) => (
    <Screen testID={testID} topInset={false}>
      <SeerahBackdrop />
      <View style={{ paddingHorizontal: theme.space[4], paddingTop: insets.top + theme.space[2] }}>
        <View style={{ alignSelf: 'flex-start' }}>
          <BackButton onPress={backToMenu} testID="seerah-state-back" />
        </View>
      </View>
      <View style={{ flex: 1, justifyContent: 'flex-end', padding: theme.space[4], paddingBottom: insets.bottom + theme.space[4] }}>
        <SeerahStateView
          doneLabel={doneLabel}
          kind={kind}
          onAction={kind === 'downloading' ? download.cancel : download.start}
          progress={download.view.kind === 'downloading' ? download.view.progress : 0}
          sizeLabel={sizeLabel}
        />
      </View>
    </Screen>
  );

  if (book === undefined) {
    return stateScreen(download.view.kind);
  }
  if (world.events.length === 0 || level === undefined) {
    return stateScreen(download.view.kind === 'downloading' ? 'downloading' : 'error');
  }

  if (view === 'list') {
    return (
      <Screen testID={testID}>
        <SeerahListView
          events={world.events}
          onBack={backToMenu}
          onOpen={openEvent}
          onToggleView={toggleView}
          placeName={placeName}
        />
      </Screen>
    );
  }

  const art = seerahArtFor(level.id, theme.name);
  const isCity = level.id !== REGION;
  const cityPlaceName = level.parentPlaceId === null ? '' : placeName(level.parentPlaceId);
  const total = index.total;
  const emptyYear = typeof focus === 'number' && (index.counts[focus] ?? 0) === 0;
  const expanded = windowClass === 'expanded';

  const timeline = (
    <TimelineBar
      counts={index.counts}
      focus={focus}
      milestones={marks}
      onFocusChange={(next) => {
        setFocus(next);
        setCallout(null);
      }}
      orientation={expanded ? 'vertical' : 'horizontal'}
      totalCount={total}
      unspecifiedCount={index.unspecifiedCount}
    />
  );

  const map =
    art === null ? null : (
      <SeerahMap
        areaLabels={level.areaLabels}
        art={art}
        dimmedRouteIds={dimmedRoutes}
        focusPlaceId={focusPlaceId}
        insets={{ bottom: expanded ? theme.space[8] : TIMELINE_CLEARANCE, top: insets.top + 80 }}
        key={level.id}
        levelId={level.id}
        onBackToRegion={() => setLevelId(REGION)}
        onCityOpen={(next) => {
          setLevelId(next);
          setCallout(null);
          setSelectedPlaceId(null);
        }}
        onOtherPress={() => showSpot(t('seerah.map.other.name'), otherEvents(world.events, focus))}
        onPinPress={onPinPress}
        otherCount={otherCount(world.events, focus)}
        pins={pins}
        routePaths={level.routePaths}
        selectedPlaceId={selectedPlaceId}
        viewbox={level.viewbox}
        zoom={level.zoom}
      />
    );

  const nearest = typeof focus === 'number' ? nearestAgeWithEvents(index, focus) : null;
  const dock = { bottom: expanded ? theme.space[4] : TIMELINE_CLEARANCE, left: theme.space[4], position: 'absolute', right: theme.space[4] } as const;

  const mapArea = (
    <View style={{ flex: 1 }}>
      {map}
      <View pointerEvents="box-none" style={{ end: theme.space[4], position: 'absolute', start: theme.space[4], top: insets.top + theme.space[2] }}>
        <MapHeader
          levelChip={isCity ? { label: t('seerah.map.levelRegion'), onPress: () => setLevelId(REGION) } : undefined}
          onBack={backToMenu}
          onOpenKey={() => setKeyOpen(true)}
          onToggleView={toggleView}
          subtitle={isCity ? `${t('seerah.title')} · ${eventCountText(t, pins.reduce((sum, pin) => sum + pin.count, 0))}` : t('seerah.regionSubtitle')}
          title={isCity ? cityPlaceName : t('seerah.title')}
          view="map"
        />
      </View>
      {callout !== null ? (
        <View pointerEvents="box-none" style={{ ...dock, alignItems: 'center' }}>
          <EventCallout
            onOpen={() => openEvent(callout.id)}
            subtitle={[callout.ageFrom === null ? t('seerah.age.unspecified') : ageText(t, callout.ageFrom), placeName(callout.placeId)].join(' · ')}
            title={callout.titleAr}
          />
        </View>
      ) : null}
      {emptyYear && typeof focus === 'number' ? (
        <View pointerEvents="box-none" style={dock}>
          <SeerahStateView age={focus} kind="emptyYear" nearestAge={nearest} onAction={nearest === null ? undefined : () => setFocus(nearest)} />
        </View>
      ) : null}
      {expanded ? null : (
        <View pointerEvents="box-none" style={{ bottom: insets.bottom + theme.space[2], end: theme.space[3], position: 'absolute', start: theme.space[3] }}>
          {timeline}
        </View>
      )}
    </View>
  );

  const openEventPane = (onBack: () => void) =>
    openEventId === null ? null : (
      <SeerahEventPane
        eventId={openEventId}
        onBack={onBack}
        onNavigate={setOpenEventId}
        onShowAge={(age) => {
          setFocus(age);
          setOpenEventId(null);
          chooseView('map');
        }}
        onShowList={() => {
          setOpenEventId(null);
          chooseView('list');
        }}
        onShowPlace={showOnMap}
      />
    );

  return (
    <Screen testID={testID} topInset={false}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {expanded ? (
          <View style={{ paddingBottom: insets.bottom + theme.space[3], paddingTop: insets.top + theme.space[3], width: VERTICAL_TIMELINE_WIDTH }}>
            {timeline}
          </View>
        ) : null}
        {mapArea}
        {expanded && openEventId !== null ? (
          <View style={{ paddingTop: insets.top, width: PANEL_WIDTH }} testID="seerah-event-panel">
            {openEventPane(() => setOpenEventId(null))}
          </View>
        ) : null}
      </View>
      <SeerahSheet onClose={() => setKeyOpen(false)} visible={keyOpen}>
        <MapKeyContent onClose={() => setKeyOpen(false)} />
      </SeerahSheet>
      <SeerahSheet card={false} onClose={() => setSpot(null)} visible={spot !== null}>
        {spot === null ? null : (
          <SpotSheet
            eventsLabel={eventCountText(t, spot.events.length)}
            onClose={() => setSpot(null)}
            onRowPress={openFromSpot}
            rows={spot.events.map(eventRow)}
            title={spot.title}
          />
        )}
      </SeerahSheet>
      <SeerahSheet detent="large" onClose={() => setOpenEventId(null)} visible={windowClass === 'medium' && openEventId !== null}>
        {openEventPane(() => setOpenEventId(null))}
      </SeerahSheet>
    </Screen>
  );
}
