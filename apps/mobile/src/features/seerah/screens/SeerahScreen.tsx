import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { I18nManager, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useScreenInsets } from '@/core/layout/useScreenInsets';
import { useWindowClass } from '@/core/layout';
import { formatNumber } from '@/core/i18n';
import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { formatPackSizeMb } from '@/features/hadith/format';
import { MINI_PLAYER_CAPSULE, MINI_PLAYER_CAPSULE_FOOTPRINT } from '@/features/audio/mini-player-metrics';
import { BackButton, Screen } from '@/shared/ui';

import { seerahArtFor } from '../art/seerah-art';
import { autoInstallSeerah } from '../auto-install';
import { EventCallout } from '../components/EventCallout';
import type { EventListItem } from '../components/EventListCard';
import { MapHeader } from '../components/MapHeader';
import { MapKeyContent } from '../components/MapKeyContent';
import { MapTopFade } from '../components/MapTopFade';
import { SeerahBackdrop } from '../components/SeerahBackdrop';
import { SeerahListView } from '../components/SeerahListView';
import { SeerahMap } from '../components/SeerahMap';
import { SeerahSheet } from '../components/SeerahSheet';
import { SeerahStateView, type SeerahStateKind } from '../components/SeerahStateView';
import { SpotSheet } from '../components/SpotSheet';
import { TimelineBar } from '../components/TimelineBar';
import { TimelineCapsule } from '../components/TimelineCapsule';
import { ageRangeText, ageText, eventCountText, focusTitle } from '../format';
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
  useArtReady,
  useSeerahBook,
  useSeerahCatalogEntry,
  useSeerahDownload,
  useSeerahReady,
  useSeerahViewChoice,
  useSeerahWorld,
} from '../hooks';
import { goBackOr, seerahHref } from '../routes';
import { useTimelineCollapse } from '../timeline-collapse';
import type { SeerahEvent, SeerahFocus } from '../types';
import { SeerahEventPane } from './SeerahEventPane';

const REGION = 'region';
const PANEL_WIDTH = 440;
// On a wide window the bottom timeline, the callout and the empty-year card keep a centred column, like the reading
// column cap (developer, 26 Nov 2026: the iPad keeps the phone's bottom timeline).
const DOCK_MAX_WIDTH = 720;
// Frame SeerahMapRegion: the timeline card (136 pt) floats 28 pt above the bottom edge, and the bottom chip stack ends 44 pt
// above the card.
const TIMELINE_CLEARANCE = 208;
// Cards docked over the map (the empty-year card, the callout) end 30 pt above the timeline card (frame SeerahStateEmptyYear).
const DOCK_BOTTOM = 194;
// The header row's bottom under the top inset: 8 pt down, 44 pt tall.
const HEADER_BOTTOM = 52;

/**
 * The Seerah screen (frames SeerahMapRegion, SeerahMapMakkah, SeerahMapMadinah, SeerahTimeline, SeerahList, SeerahExpanded,
 * SeerahState*): the map with its timeline, or the list, or the card that says why there is none (downloading, offline,
 * failed). The pack downloads with no tap (ADR 0097): opening the screen, or the catalogue entry arriving while it is open,
 * starts the install in the background. Layout follows the window class: compact is the map full-bleed with the timeline
 * at the bottom and the event as a full-screen push; medium opens the event in a bottom sheet; expanded puts the event in a
 * side panel on the end side. Every width keeps the timeline at the bottom (developer, 26 Nov 2026), centred and capped on a wide window.
 * Everything it shows comes from content.db: no tap waits on the network.
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
  const seerahId = catalog?.resourceId;
  // Keyed on the id, never on the entry: an install bumps the catalogue, and a pack that always fails must not loop.
  useEffect(() => {
    autoInstallSeerah();
  }, [seerahId]);
  const [view, toggleView, chooseView] = useSeerahViewChoice(initialView);
  // Held here, not in the map: a level change remounts the map and must not wait for a push that never comes.
  const artReady = useArtReady();
  const [timelineCollapsed, setTimelineCollapsed] = useTimelineCollapse();

  const [levelId, setLevelId] = useState(REGION);
  const [focus, setFocus] = useState<SeerahFocus>(initialAge);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [focusPlaceId, setFocusPlaceId] = useState<string | null>(null);
  const [callout, setCallout] = useState<SeerahEvent | null>(null);
  // `places`: the events of several places, each row naming its place; `other`: the «أخرى» bucket (no place to name).
  const [spot, setSpot] = useState<{ title: string; events: SeerahEvent[]; kind: 'spot' | 'places' | 'other' } | null>(null);
  const [keyOpen, setKeyOpen] = useState(false);
  const [openEventId, setOpenEventId] = useState<string | null>(null);
  const [placeApplied, setPlaceApplied] = useState(false);
  const [calloutHeight, setCalloutHeight] = useState(0);

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

  // A sheet of several places names each row's place, so no event reads as being at another place (ADR 0091, Context).
  const eventRow = (event: SeerahEvent, withPlace: boolean): EventListItem => {
    const age = event.ageFrom === null ? t('seerah.age.unspecified') : ageRangeText(t, event.ageFrom, event.ageTo ?? event.ageFrom);
    return { id: event.id, subtitle: withPlace ? `${age} · ${placeName(event.placeId)}` : age, title: event.titleAr };
  };

  const openEvent = (id: string) => {
    setSpot(null);
    // The list is a full screen: its rows always push the event page, whatever the window. The callout stays under the
    // pushed page (it is there on the way back), so the push never waits for the map to render again.
    if (windowClass === 'compact' || view === 'list') {
      router.push(seerahHref.event(id));
    } else {
      setCallout(null);
      setOpenEventId(id);
    }
  };

  // A row of the spot sheet (a modal): the sheet closes first, and the event opens on the next frame. A push that lands
  // while the modal is still dismissing is dropped on iOS.
  const openFromSpot = (id: string) => {
    setSpot(null);
    requestAnimationFrame(() => openEvent(id));
  };

  const showSpot = (title: string, events: SeerahEvent[], kind: 'spot' | 'places' | 'other' = 'spot') => {
    setCallout(null);
    setSpot({ events: sortByAge(events), kind, title });
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

  const onClusterOpen = (placeIds: string[]) => {
    if (level === undefined || placeIds[0] === undefined) {
      return;
    }
    const events = placeIds.flatMap((placeId) => eventsOfPin({ events: world.events, focus, level, placeId, places: world.places }));
    const unique = [...new Map(events.map((event) => [event.id, event])).values()];
    showSpot(
      placeIds.length === 1 ? placeName(placeIds[0]) : t('seerah.spot.nearbyTitle', { places: formatNumber(placeIds.length, locale) }),
      unique,
      placeIds.length > 1 ? 'places' : 'spot',
    );
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
          onAction={kind === 'downloading' ? undefined : download.start}
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
      <Screen testID={testID} topInset={false}>
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

  const focusCount = focus === null ? total : focus === 'unspecified' ? index.unspecifiedCount : (index.counts[focus] ?? 0);
  const capsuleLabel = t('seerah.timeline.capsule', { events: eventCountText(t, focusCount), title: focusTitle(t, focus) });
  const timeline = timelineCollapsed ? (
    <TimelineCapsule
      accessibilityLabel={t('seerah.timeline.show', { focus: capsuleLabel })}
      label={capsuleLabel}
      onExpand={() => setTimelineCollapsed(false)}
    />
  ) : (
    <TimelineBar
      counts={index.counts}
      focus={focus}
      milestones={marks}
      onCollapse={() => setTimelineCollapsed(true)}
      onFocusChange={(next) => {
        setFocus(next);
        setCallout(null);
      }}
      totalCount={total}
      unspecifiedCount={index.unspecifiedCount}
    />
  );

  // Hidden, the timeline leaves only its capsule (18 pt above the safe area, 44 tall), so the map, the bottom chips and the
  // docked cards take its space back (developer, 26 Nov 2026).
  const capsuleClearance = insets.bottom + MINI_PLAYER_CAPSULE_FOOTPRINT + theme.space[3];
  const bottomClearance = timelineCollapsed ? capsuleClearance : TIMELINE_CLEARANCE;
  const dockBottom = timelineCollapsed ? capsuleClearance : DOCK_BOTTOM;
  // The callout docks above the timeline; the map keeps its centred point and its edge chips clear of it.
  const calloutLift = dockBottom + calloutHeight;
  // The map runs under the side safe areas (a phone in landscape) and its controls keep clear of them. With the event
  // panel open the map's end edge is the panel, which clears the end inset itself.
  const panelOpen = expanded && openEventId !== null;
  const mapStart = insets.start;
  const mapEnd = panelOpen ? 0 : insets.end;
  const map =
    art === null ? null : (
      <SeerahMap
        areaLabels={level.areaLabels}
        art={art}
        artReady={artReady}
        dimmedRouteIds={dimmedRoutes}
        focusPlaceId={focusPlaceId}
        insets={{
          bottom: Math.max(bottomClearance, callout !== null ? calloutLift : 0),
          // The map is never mirrored: its side insets are physical.
          left: I18nManager.isRTL ? mapEnd : mapStart,
          right: I18nManager.isRTL ? mapStart : mapEnd,
          top: insets.top + HEADER_BOTTOM,
        }}
        key={level.id}
        levelId={level.id}
        onBackToRegion={() => setLevelId(REGION)}
        onCityOpen={(next) => {
          setLevelId(next);
          setCallout(null);
          setSelectedPlaceId(null);
        }}
        onClusterOpen={onClusterOpen}
        onOtherPress={() => showSpot(t('seerah.map.other.name'), otherEvents(world.events, focus), 'other')}
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
  const dock = { alignItems: 'center', bottom: dockBottom, end: theme.space[4] + mapEnd, position: 'absolute', start: theme.space[4] + mapStart } as const;
  const column = { maxWidth: DOCK_MAX_WIDTH, width: '100%' } as const;

  const mapArea = (
    <View style={{ flex: 1 }}>
      {map}
      <MapTopFade height={insets.top + HEADER_BOTTOM + theme.space[6]} />
      <View pointerEvents="box-none" style={{ end: theme.space[4] + mapEnd, position: 'absolute', start: theme.space[4] + mapStart, top: insets.top + theme.space[2] }} testID="seerah-map-header-row">
        <MapHeader
          levelChip={isCity ? { label: t('seerah.map.levelRegion'), onPress: () => setLevelId(REGION) } : undefined}
          onBack={backToMenu}
          onOpenKey={() => setKeyOpen(true)}
          onToggleView={toggleView}
          // Frame SeerahExpanded: a compact centred title pill on a wide window; phones stretch it.
          titleFit={windowClass === 'compact' ? 'fill' : 'hug'}
          subtitle={isCity ? `${t('seerah.title')} · ${eventCountText(t, pins.reduce((sum, pin) => sum + pin.count, 0))}` : t('seerah.regionSubtitle')}
          title={isCity ? cityPlaceName : t('seerah.title')}
          view="map"
        />
      </View>
      {callout !== null ? (
        <View onLayout={(event) => setCalloutHeight(event.nativeEvent.layout.height)} pointerEvents="box-none" style={dock}>
          <EventCallout
            onOpen={() => openEvent(callout.id)}
            subtitle={[callout.ageFrom === null ? t('seerah.age.unspecified') : ageText(t, callout.ageFrom), placeName(callout.placeId)].join(' · ')}
            title={callout.titleAr}
          />
        </View>
      ) : null}
      {emptyYear && typeof focus === 'number' ? (
        <View pointerEvents="box-none" style={dock}>
          <View pointerEvents="box-none" style={column}>
            <SeerahStateView age={focus} kind="emptyYear" nearestAge={nearest} onAction={nearest === null ? undefined : () => setFocus(nearest)} />
          </View>
        </View>
      ) : null}
      <View
        pointerEvents="box-none"
        style={{ alignItems: 'center', bottom: timelineCollapsed ? insets.bottom + MINI_PLAYER_CAPSULE.bottom : theme.size.pillInset, end: theme.space[3] + mapEnd, position: 'absolute', start: theme.space[3] + mapStart }} testID="seerah-timeline-row">
        <View pointerEvents="box-none" style={column} testID="seerah-timeline-dock">
          {timeline}
        </View>
      </View>
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
          setTimelineCollapsed(false);
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Screen sideInsets={false} testID={testID} topInset={false}>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {mapArea}
          {panelOpen ? (
            <View style={{ paddingEnd: insets.end, paddingTop: insets.top, width: PANEL_WIDTH + insets.end }} testID="seerah-event-panel">
              {openEventPane(() => setOpenEventId(null))}
            </View>
          ) : null}
        </View>
        <SeerahSheet detent="large" onClose={() => setKeyOpen(false)} visible={keyOpen}>
          <MapKeyContent onClose={() => setKeyOpen(false)} />
        </SeerahSheet>
        <SeerahSheet onClose={() => setSpot(null)} visible={spot !== null}>
          {spot === null ? null : (
            <SpotSheet
              eventsLabel={eventCountText(t, spot.events.length)}
              onClose={() => setSpot(null)}
              onRowPress={openFromSpot}
              nearby={spot.kind !== 'spot'}
              rows={spot.events.map((event) => eventRow(event, spot.kind === 'places'))}
              title={spot.title}
            />
          )}
        </SeerahSheet>
        <SeerahSheet detent="large" onClose={() => setOpenEventId(null)} visible={windowClass === 'medium' && openEventId !== null}>
          {openEventPane(() => setOpenEventId(null))}
        </SeerahSheet>
      </Screen>
    </GestureHandlerRootView>
  );
}
