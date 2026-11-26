import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import Svg, { SvgAst } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { spring, useDissolve } from '@/core/theme/motion';
import { UiText } from '@/shared/ui';

import { parsedArt } from '../art/parsed-art';
import { useAfterFrame } from '../hooks/useArtReady';
import { ageRangeText, ageShortText, eventCountText } from '../format';
import {
  centerOn,
  clampScale,
  clampView,
  clusterPins,
  coverScale,
  edgeDirection,
  estimateLabelWidth,
  fitLabelSide,
  focusView,
  insideRect,
  isOnScreen,
  levelSwitch,
  placeLabels,
  toContent,
  toScreen,
  visibleContentRect,
  type EdgeDirection,
  type LabelRect,
  type MapView,
  type PinCluster,
  type Point,
  type Rect,
} from '../logic';
import type { SeerahAreaLabel, SeerahMapPin, SeerahMapZoom, SeerahRoutePath } from '../types';

import { ClusterPin } from './ClusterPin';
import { EdgeChip } from './EdgeChip';
import { MapAnchor } from './MapAnchor';
import { LABEL_OFFSET, MapLabel, type MapLabelEmphasis } from './MapLabel';
import { MapPin } from './MapPin';
import { panValues, pinchValues, settleValues, springView, writeView, type ViewValues } from './map-view-values';
import { RouteLine } from './RouteLine';

const OFFSCREEN_MARGIN = 60;
const CITY_CENTRE_RADIUS = 90;
const LABEL_WIDTH = 220;
// Room around a scrolling chip column for the chips' glass shadow (0 8 32): the scroll view clips at its bounds, so the
// column is padded by the shadow's reach and moved out by the same amount; the chips stay where they were.
const SHADOW_PAD = 32;
const SHADOW_PAD_BOTTOM = 40;

export type SeerahMapProps = {
  /** `region`, `makkah` or `madinah`. Key the map by it, so a level change remounts (the cross-fade) and starts at the level's own view. */
  levelId: string;
  /** The SVG source of the art for this level and theme (see art/seerah-art.generated.ts). */
  art: string;
  viewbox: readonly [number, number, number, number];
  zoom: SeerahMapZoom;
  pins: readonly SeerahMapPin[];
  routePaths: readonly SeerahRoutePath[];
  areaLabels: readonly SeerahAreaLabel[];
  /** Routes with no event in the focus: drawn faint. */
  dimmedRouteIds?: readonly string[];
  /** Events in the «أخرى» bucket that match the focus; 0 hides the chip. */
  otherCount: number;
  selectedPlaceId?: string | null;
  /**
   * A place to centre on (the event page's «show on map», a list event's place). The map centres it in the visible area
   * once each time it changes, animated unless Reduce Motion is on.
   */
  focusPlaceId?: string | null;
  /**
   * The map is drawn under the header and the timeline (and under an open callout): the visible area is the window
   * between `top` and `size - bottom`, and edge chips keep clear of it. `left` and `right` are the side safe areas the art
   * runs under (a phone in landscape); they are physical sides, as the map is never mirrored.
   */
  insets?: { top: number; bottom: number; left?: number; right?: number };
  /** A single place (or one event) was tapped; `scale` is the scale before the tap, so the screen can tell the fan-out is active. */
  onPinPress: (placeId: string, scale: number) => void;
  /** A city with its own map was tapped, or pinched into. */
  onCityOpen: (levelId: string, placeId: string) => void;
  /** On a city map, pinch out to the minimum asks for the region map. */
  onBackToRegion?: () => void;
  onOtherPress: () => void;
  /**
   * False while the screen's push is still animating (`useArtReady`): the map draws its frame (the page colour) and mounts
   * the art, routes, pins and edge chips a frame after this turns true, the art fading in. Held by the screen, so a level
   * change (which remounts the map) draws its art a frame later, not after another transition.
   */
  artReady?: boolean;
  /** A cluster tapped at or past the middle of the zoom range, where a tap no longer spreads it: list its places' events. */
  onClusterOpen?: (placeIds: string[]) => void;
  testID?: string;
};

type Item = { cluster: PinCluster; pin: SeerahMapPin | null; screen: { x: number; y: number } };
/** The four edge-chip stacks («أخرى» shares the south stack), or the two scrolling columns of a short window. */
type ChipStack = 'north' | 'west' | 'east' | 'south' | 'start' | 'end';

/** What a pin's label is: the city with its own map, a single event's title, a place with several events, or a landmark. */
function labelKind(pin: SeerahMapPin): MapLabelEmphasis {
  if (pin.opensLevel !== null) {
    return 'city';
  }
  return pin.count === 1 ? 'event' : pin.count === 0 ? 'landmark' : 'place';
}

/**
 * The map of a level (frames SeerahMapRegion, SeerahMapMakkah, SeerahMapMadinah): static SVG art under one shared pan and
 * pinch transform. Pins, clusters, labels and the route strokes are native views on top, in their own layer above the crisp
 * overlay. They are anchored at their content point and counter-scaled, so they keep their size in points. The transform
 * runs on the UI thread; the cluster and label passes run when a gesture ends, on a `view` snapshot. The map is never
 * mirrored. A tap centres its item in the visible area and zooms in; after a gesture or a tap settles, the art is drawn
 * again at screen resolution over the map (the crisp overlay), so it stays sharp when zoomed.
 */
export function SeerahMap({
  levelId,
  art,
  viewbox,
  zoom,
  pins,
  routePaths,
  areaLabels,
  dimmedRouteIds = [],
  otherCount,
  selectedPlaceId = null,
  focusPlaceId = null,
  insets = { bottom: 220, top: 112 },
  onPinPress,
  onCityOpen,
  onBackToRegion,
  onOtherPress,
  onClusterOpen,
  artReady = true,
  testID = 'seerah-map',
}: SeerahMapProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const reduceMotion = useReducedMotion();
  const dissolve = useDissolve();
  const window = useWindowDimensions();
  const [size, setSize] = useState({ height: window.height, width: window.width });
  const content = useMemo(() => ({ height: viewbox[3] - viewbox[1], width: viewbox[2] - viewbox[0] }), [viewbox]);
  const insetLeft = insets.left ?? 0;
  const insetRight = insets.right ?? 0;
  const visibleRect = useMemo<Rect>(
    () => ({
      height: Math.max(1, size.height - insets.top - insets.bottom),
      width: Math.max(1, size.width - insetLeft - insetRight),
      x: insetLeft,
      y: insets.top,
    }),
    [insetLeft, insetRight, insets.bottom, insets.top, size.height, size.width],
  );
  const midScale = (zoom.default + zoom.max) / 2;

  // The start view (frame SeerahMapRegion): the mean of the places with events, once per mount (the map is keyed by level),
  // so a timeline focus that changes the counts never moves the map.
  const [startCentre] = useState(() => {
    const counted = pins.filter((pin) => pin.count > 0 && pin.kind !== 'region');
    const from = counted.length > 0 ? counted : pins;
    return from.length === 0
      ? { x: content.width / 2, y: content.height / 2 }
      : {
          x: from.reduce((sum, pin) => sum + pin.x, 0) / from.length,
          y: from.reduce((sum, pin) => sum + pin.y, 0) / from.length,
        };
  });

  // A window wider than the art at its default scale (an iPad in landscape) starts at the scale that covers it: below
  // that the art sits centred with its border and blank page showing at both sides.
  const initial = useMemo(
    () => clampView(centerOn(startCentre, clampScale(Math.max(zoom.default, coverScale(content, size)), zoom), size), content, size),
    [startCentre, zoom, size, content],
  );
  const [view, setView] = useState<MapView>(initial);
  // The art layer is a bitmap of the whole map at 1×: past 1× it blurs, so the visible part is drawn again at screen
  // resolution (the crisp overlay). At or under 1× it is already sharp and the overlay is skipped.
  // The overlay stays mounted once drawn: a settle only moves it and changes its viewBox (a redraw, not thousands of new
  // native SVG nodes), and `on` says whether it is current. A gesture hides it on the UI thread (`crispOn`).
  const [crisp, setCrisp] = useState<{ rect: Rect; on: boolean } | null>(() =>
    initial.scale > 1 ? { on: true, rect: visibleContentRect(initial, size, content) } : null,
  );
  const applyCrisp = (rect: Rect | null) => setCrisp((previous) => (rect !== null ? { on: true, rect } : previous === null ? null : { ...previous, on: false }));
  const crispFor = (next: MapView, viewport = size): Rect | null => (next.scale > 1 ? visibleContentRect(next, viewport, content) : null);
  // Opening draws the frame at once (the page colour under the header and the timeline); the art, routes, pins and edge
  // chips mount a frame after the push transition ends, the art fading in (developer, 15 Nov 2026).
  const artShown = useAfterFrame(artReady);
  const scale = useSharedValue(initial.scale);
  const tx = useSharedValue(initial.tx);
  const ty = useSharedValue(initial.ty);
  const values = useMemo<ViewValues>(() => ({ scale, tx, ty }), [scale, tx, ty]);
  // 1 while the crisp overlay is current. A gesture drops it on its first frame on the UI thread, so the overlay never
  // lags behind the moving map while React catches up; React state only mounts and unmounts it.
  const crispOn = useSharedValue(0);
  const springConfig = spring();
  // The edge-chip stacks as laid out over the map (screen space). Labels keep clear of them and a pin under one is not drawn,
  // so nothing peeks out from behind a chip or loses its tap to it.
  const [chipBoxes, setChipBoxes] = useState<Partial<Record<ChipStack, LabelRect>>>({});
  const measureStack = (stack: ChipStack, pad = { bottom: 0, side: 0, top: 0 }) => (event: LayoutChangeEvent) => {
    const { height, width, x, y } = event.nativeEvent.layout;
    // A padded column's obstacle is the chips' area, not the room left for their shadow.
    const box = { bottom: y + height - pad.bottom, left: x + pad.side, right: x + width - pad.side, top: y + pad.top };
    setChipBoxes((previous) => {
      const old = previous[stack];
      return old !== undefined && old.left === box.left && old.top === box.top && old.right === box.right && old.bottom === box.bottom
        ? previous
        : { ...previous, [stack]: box };
    });
  };

  const onLayout = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    if (width === size.width && height === size.height) {
      return;
    }
    const middle = toContent(view, { x: size.width / 2, y: size.height / 2 });
    const next = { height, width };
    setSize(next);
    const resized = clampView(centerOn(middle, clampScale(Math.max(view.scale, coverScale(content, next)), zoom), next), content, next);
    writeView(values, resized);
    setView(resized);
    applyCrisp(crispFor(resized, next));
  };

  const commit = useCallback(
    (nextScale: number, nextTx: number, nextTy: number) => {
      const next = { scale: nextScale, tx: nextTx, ty: nextTy };
      setView(next);
      const centre = { x: size.width / 2, y: size.height / 2 };
      const city = pins
        .filter((pin) => pin.opensLevel !== null)
        .map((pin) => ({ pin, distance: Math.hypot(toScreen(next, pin).x - centre.x, toScreen(next, pin).y - centre.y) }))
        .filter((candidate) => candidate.distance <= CITY_CENTRE_RADIUS)
        .sort((a, b) => a.distance - b.distance)[0];
      const result = levelSwitch({
        cityUnderCentre: city !== undefined,
        level: zoom.cityThreshold !== null ? 'region' : 'city',
        scale: nextScale,
        zoom,
      });
      if (result === 'open-city' && city?.pin.opensLevel) {
        onCityOpen(city.pin.opensLevel, city.pin.placeId);
      } else if (result === 'back-to-region') {
        onBackToRegion?.();
      }
    },
    [onBackToRegion, onCityOpen, pins, size.height, size.width, zoom],
  );

  // Runs on the UI thread when a gesture's spring settles: the crisp overlay shows the rectangle the window now shows.
  const showCrisp = (rect: Rect) => {
    'worklet';
    scheduleOnRN(applyCrisp, scale.value > 1 ? rect : null);
  };
  const hideCrisp = () => {
    'worklet';
    crispOn.value = 0;
  };

  const pan = usePanGesture({
    onActivate: () => {
      'worklet';
      hideCrisp();
    },
    onUpdate: (event) => {
      'worklet';
      panValues(values, { x: event.changeX, y: event.changeY }, content, size);
    },
    onDeactivate: () => {
      'worklet';
      scheduleOnRN(commit, scale.value, tx.value, ty.value);
      settleValues(values, content, size, springConfig, showCrisp);
    },
  });
  const pinch = usePinchGesture({
    onActivate: () => {
      'worklet';
      hideCrisp();
    },
    onUpdate: (event) => {
      'worklet';
      pinchValues(values, event.scaleChange, { x: event.focalX, y: event.focalY }, zoom, content, size);
    },
    onDeactivate: () => {
      'worklet';
      scheduleOnRN(commit, scale.value, tx.value, ty.value);
      settleValues(values, content, size, springConfig, showCrisp);
    },
  });
  const gesture = useSimultaneousGestures(pan, pinch);

  const ast = artShown ? parsedArt(art) : null;
  const artNode = useMemo(
    () =>
      ast === null ? null : (
        <Animated.View entering={reduceMotion ? undefined : dissolve.entering} testID={`${testID}-art-svg`}>
          <SvgAst ast={ast} override={{ height: content.height, width: content.width }} />
        </Animated.View>
      ),
    // `dissolve` is a new object each render; its value never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ast, content.height, content.width, reduceMotion, testID],
  );

  const routes = (prefix: string) =>
    routePaths.map((path) => (
      <RouteLine
        d={path.d}
        dimmed={dimmedRouteIds.includes(path.routeId)}
        key={`${path.routeId}-${path.d.slice(0, 24)}`}
        kind={path.kind}
        scale={scale}
        testID={`${prefix}-route-${path.routeId}`}
      />
    ));

  // The crisp overlay: the art and the routes of the visible rectangle, drawn again at screen resolution once the view
  // settles (the zoomed layers are bitmaps of the whole map and blur past 1×). The zoomed route layer hides under it.
  const crispRect = crisp?.rect ?? null;
  const crispNode = useMemo(() => {
    if (crispRect === null || ast === null) {
      return null;
    }
    const origin = toScreen(view, crispRect);
    const box = { height: crispRect.height * view.scale, left: origin.x, position: 'absolute', top: origin.y, width: crispRect.width * view.scale } as const;
    const viewBox = `${crispRect.x} ${crispRect.y} ${crispRect.width} ${crispRect.height}`;
    return (
      <>
        <SvgAst
          ast={ast}
          override={{
            height: box.height,
            pointerEvents: 'none',
            preserveAspectRatio: 'xMinYMin meet',
            style: { left: box.left, position: 'absolute', top: box.top },
            testID: `${testID}-crisp`,
            viewBox,
            width: box.width,
          }}
        />
        <Svg height={box.height} pointerEvents="none" preserveAspectRatio="xMinYMin meet" style={box} testID={`${testID}-crisp-routes`} viewBox={viewBox} width={box.width}>
          {routes(`${testID}-crisp`)}
        </Svg>
      </>
    );
    // `routes` reads only the props listed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ast, crispRect, testID, view, routePaths, dimmedRouteIds]);

  useEffect(() => {
    crispOn.set(crisp?.on === true ? 1 : 0);
  }, [crisp, crispOn]);
  const crispStyle = useAnimatedStyle(() => ({ opacity: crispOn.value }));
  const routeLayerStyle = useAnimatedStyle(() => ({ opacity: 1 - crispOn.value }));

  const layerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  // The chip stacks run down the start edge (frame SeerahMapRegion) and the east one from 42% down. In a short window (a
  // phone in landscape) the band between the header and the timeline can't hold them, so the chips gather in one narrow
  // column per side, each scrolling within the band: north, west, «أخرى» and south on the start side, east on the end side.
  const chipHeight = theme.size.touchTarget - 2 * theme.space[1];
  const bandTop = insets.top + theme.space[3];
  const bandBottom = size.height - insets.bottom;

  const { items, edges, labels, sides, squeezed } = useMemo(() => {
    const placed = pins.map((pin) => ({ pin, screen: toScreen(view, pin) }));
    const edgeChips = placed
      .filter(({ pin, screen }) => pin.kind === 'region' && pin.count > 0 && !isOnScreen(screen, size))
      .flatMap(({ pin, screen }) => {
        const direction = edgeDirection(screen, size);
        return direction === null ? [] : [{ direction, pin }];
      });
    const columnHeight = (count: number) => (count === 0 ? 0 : count * chipHeight + (count - 1) * theme.space[1]);
    const eastCount = edgeChips.filter((chip) => chip.direction === 'east').length;
    const startCount = edgeChips.length - eastCount + (otherCount > 0 ? 1 : 0);
    const columns =
      columnHeight(startCount) + 2 * theme.space[3] > bandBottom - bandTop || size.height * 0.42 + columnHeight(eastCount) > bandBottom;
    // Labels keep clear of the chips' visible boxes and a pin under one is not drawn.
    const obstacles = (columns ? [chipBoxes.start, chipBoxes.end] : [chipBoxes.north, chipBoxes.west, chipBoxes.east, chipBoxes.south]).filter(
      (box): box is LabelRect => box !== undefined,
    );
    const visible = placed.filter(
      ({ screen }) => isOnScreen(screen, size, OFFSCREEN_MARGIN) && !obstacles.some((box) => insideRect(screen, box)),
    );
    const counted = visible.filter(({ pin }) => pin.count > 0);
    const clusters = clusterPins(
      counted.map(({ pin, screen }) => ({
        anchor: pin.opensLevel !== null,
        count: pin.count,
        id: pin.placeId,
        landmark: pin.artLandmark,
        order: pin.order,
        x: screen.x,
        y: screen.y,
      })),
    );
    const byId = new Map(pins.map((pin) => [pin.placeId, pin]));
    const clusterItems: Item[] = clusters.map((cluster) => ({
      cluster,
      pin: cluster.memberIds.length === 1 ? (byId.get(cluster.id) ?? null) : null,
      screen: { x: cluster.x, y: cluster.y },
    }));
    const empties = visible
      .filter(({ pin }) => pin.count === 0)
      .filter(({ screen }) => clusterItems.every((item) => Math.hypot(item.screen.x - screen.x, item.screen.y - screen.y) >= 44))
      .map(({ pin, screen }): Item => ({ cluster: { count: 0, id: pin.placeId, memberIds: [pin.placeId], x: screen.x, y: screen.y }, pin, screen }));
    const all = [...clusterItems, ...empties];
    const candidates = all.flatMap((item) => {
      if (item.pin === null) {
        return [];
      }
      const kind = labelKind(item.pin);
      const text = item.pin.count === 1 ? (item.pin.eventTitle ?? item.pin.name) : item.pin.name;
      const base = {
        count: item.pin.count,
        height: kind === 'city' ? 26 : kind === 'event' && item.pin.ageMin !== null ? 32 : 17,
        id: item.pin.placeId,
        offset: LABEL_OFFSET[kind],
        order: item.pin.order,
        priority: item.pin.labelPriority,
        side: item.pin.labelSide,
        width: Math.min(LABEL_WIDTH, estimateLabelWidth(text, kind === 'city' ? 20 : 13)),
        x: item.screen.x,
        y: item.screen.y,
      };
      return [{ ...base, side: fitLabelSide(base, size) }];
    });
    const labelled = placeLabels(candidates, all.map((item) => item.screen), obstacles);
    return {
      edges: edgeChips,
      items: all,
      labels: new Set(labelled.visible),
      sides: new Map(Object.entries(labelled.sides)),
      squeezed: columns,
    };
  }, [bandBottom, bandTop, chipBoxes, chipHeight, otherCount, pins, size, theme.space, view]);

  const pinLabel = (pin: SeerahMapPin): string => {
    const events = eventCountText(t, pin.count);
    const age = pin.ageMin === null || pin.ageMax === null ? null : ageRangeText(t, pin.ageMin, pin.ageMax);
    let label: string;
    if (pin.count === 0) {
      return t('seerah.map.pin.empty', { name: pin.name });
    }
    if (pin.count === 1 && pin.eventTitle !== null) {
      label = t('seerah.map.pin.single', { age: age ?? t('seerah.age.unspecified'), title: pin.eventTitle });
    } else {
      label = age === null ? t('seerah.map.pin.place', { events, name: pin.name }) : t('seerah.map.pin.placeAge', { age, events, name: pin.name });
    }
    if (pin.opensLevel !== null) {
      label = t('seerah.map.pin.city', { label, name: pin.name });
    }
    return pin.uncertain ? t('seerah.map.pin.approximate', { label }) : label;
  };

  /** A city pin's target scale is the city threshold, so the city opens; any other item gets the middle of the zoom range. */
  const targetScaleFor = (pin: SeerahMapPin): number => (pin.opensLevel !== null && zoom.cityThreshold !== null ? zoom.cityThreshold : midScale);

  /**
   * The one animate path for every tap: centres `point` in the visible area at the larger of the current and target scale,
   * then (once it settles) draws the crisp overlay and runs `onArrive`. Reduce Motion jumps at once.
   */
  const focusTo = (point: Point, targetScale: number, onArrive?: () => void) => {
    const next = focusView(point, Math.max(view.scale, targetScale), visibleRect, content, size, zoom);
    crispOn.set(0);
    setView(next);
    if (reduceMotion) {
      writeView(values, next);
      applyCrisp(crispFor(next));
      onArrive?.();
      return;
    }
    const finishFocus = () => {
      applyCrisp(crispFor(next));
      onArrive?.();
    };
    // A worklet copies its closure when it is created: `finishFocus` must exist by then, or the UI thread schedules
    // `undefined` and aborts (the getObject assert in JSIWorkletsModuleProxy).
    const arrive = () => {
      'worklet';
      scheduleOnRN(finishFocus);
    };
    springView(values, next, spring(), arrive);
  };

  const tapPin = (pin: SeerahMapPin) => {
    const point = { x: pin.x, y: pin.y };
    if (pin.opensLevel === null) {
      focusTo(point, targetScaleFor(pin));
      onPinPress(pin.placeId, view.scale);
      return;
    }
    // A city opens at once: waiting for the region spring to settle and then switching level crashed the UI runtime.
    onCityOpen(pin.opensLevel, pin.placeId);
  };

  const focusedRef = useRef<string | null>(null);
  useEffect(() => {
    if (focusPlaceId === null) {
      focusedRef.current = null;
      return;
    }
    const pin = pins.find((item) => item.placeId === focusPlaceId);
    if (pin === undefined || focusedRef.current === focusPlaceId) {
      return;
    }
    focusedRef.current = focusPlaceId;
    focusTo({ x: pin.x, y: pin.y }, targetScaleFor(pin));
  });

  const edgeGroups: Record<EdgeDirection, typeof edges> = { east: [], north: [], south: [], west: [] };
  edges.forEach((edge) => edgeGroups[edge.direction].push(edge));
  const stack = { gap: theme.space[1], position: 'absolute' } as const;
  // A scrolling column: the chips start at the band's top and end at its foot at the latest; the padding around them is
  // the shadow's room (SHADOW_PAD), outside the band.
  const column = { maxHeight: bandBottom - bandTop + SHADOW_PAD + SHADOW_PAD_BOTTOM, position: 'absolute', top: bandTop - SHADOW_PAD } as const;
  const columnContent = { gap: theme.space[1], paddingBottom: SHADOW_PAD_BOTTOM, paddingHorizontal: SHADOW_PAD, paddingTop: SHADOW_PAD } as const;
  const columnPad = { bottom: SHADOW_PAD_BOTTOM, side: SHADOW_PAD, top: SHADOW_PAD };
  const renderEdge = ({ direction, pin }: (typeof edges)[number]) => (
    <EdgeChip
      accessibilityHint={t('seerah.map.edge.hint')}
      accessibilityLabel={t(`seerah.map.edge.${direction}`, { events: eventCountText(t, pin.count), name: pin.name })}
      count={pin.count}
      dimmed={pin.dimmed}
      direction={direction}
      key={pin.placeId}
      label={pin.name}
      onPress={() => focusTo({ x: pin.x, y: pin.y }, targetScaleFor(pin))}
      testID={`${testID}-edge-${pin.placeId}`}
    />
  );

  const otherChip =
    otherCount > 0 ? (
      <EdgeChip
        accessibilityHint={t('seerah.map.edge.hint')}
        accessibilityLabel={t('seerah.map.other.label', { events: eventCountText(t, otherCount) })}
        count={otherCount}
        direction="other"
        label={t('seerah.map.other.name')}
        onPress={onOtherPress}
        testID={`${testID}-other`}
      />
    ) : null;

  const layerBox = { height: content.height, left: 0, position: 'absolute', top: 0, transformOrigin: 'top left', width: content.width } as const;

  return (
    <Animated.View
      entering={dissolve.entering}
      exiting={dissolve.exiting}
      onLayout={onLayout}
      style={{ backgroundColor: theme.colors.surface, flex: 1, overflow: 'hidden' }}
      testID={testID}
    >
      <GestureDetector gesture={gesture}>
        <View style={[StyleSheet.absoluteFill, { direction: 'ltr' }]} testID={`${testID}-space`}>
          <Animated.View style={[layerBox, layerStyle]} testID={`${testID}-art`}>
            {artNode}
          </Animated.View>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, crispStyle]} testID={`${testID}-crisp-layer`}>
            {crispNode}
          </Animated.View>
          <Animated.View style={[layerBox, layerStyle, routeLayerStyle]} testID={`${testID}-layer`}>
            <Svg height={content.height} pointerEvents="none" style={StyleSheet.absoluteFill} width={content.width}>
              {artShown ? routes(testID) : null}
            </Svg>
          </Animated.View>
          {/* Pins, clusters and labels in screen space over the zoomed art: they follow the transform and stay sharp. */}
          <View pointerEvents="box-none" style={StyleSheet.absoluteFill} testID={`${testID}-pins`}>
            {(artShown ? areaLabels : []).map((area) => (
              <MapAnchor key={area.id} values={values} x={area.x} y={area.y}>
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  pointerEvents="none"
                  style={{ marginStart: -60, transform: [{ rotate: `${area.rotate}deg` }], width: 120 }}
                >
                  <UiText align="center" scale="bar" style={{ opacity: theme.opacity.ornament + 0.3 }} tone="muted" variant="label" weight={600}>
                    {area.nameAr}
                  </UiText>
                </View>
              </MapAnchor>
            ))}
            {(artShown ? items : []).map((item) => {
              const content0 = toContent(view, item.screen);
              const { pin } = item;
              const selected = pin !== null && pin.placeId === selectedPlaceId;
              return (
                <MapAnchor key={item.cluster.id} testID={`${testID}-item-${item.cluster.id}`} values={values} x={content0.x} y={content0.y}>
                  <View style={{ left: -22, position: 'absolute', top: -22 }}>
                    {pin === null ? (
                      <ClusterPin
                        count={item.cluster.count}
                        label={t('seerah.map.pin.cluster', { events: eventCountText(t, item.cluster.count), places: formatNumber(item.cluster.memberIds.length, locale) })}
                        onPress={() => {
                          // Below the middle zoom a tap spreads the cluster; from there on it lists the events (frame SeerahClusterSheet).
                          const spread = view.scale < midScale - 0.01;
                          focusTo(content0, midScale);
                          if (!spread) {
                            onClusterOpen?.(item.cluster.memberIds);
                          }
                        }}
                        testID={`${testID}-cluster-${item.cluster.id}`}
                      />
                    ) : pin.count > 1 ? (
                      <ClusterPin
                        count={pin.count}
                        dimmed={pin.dimmed}
                        label={pinLabel(pin)}
                        onPress={() => tapPin(pin)}
                        selected={selected}
                        testID={`${testID}-pin-${pin.placeId}`}
                        variant={pin.opensLevel === null ? 'cluster' : 'city'}
                      />
                    ) : (
                      <MapPin
                        dimmed={pin.dimmed}
                        label={pinLabel(pin)}
                        onPress={() => tapPin(pin)}
                        selected={selected}
                        testID={`${testID}-pin-${pin.placeId}`}
                        uncertain={pin.uncertain}
                        variant={pin.count === 0 ? 'empty' : 'single'}
                      />
                    )}
                  </View>
                  {pin !== null && labels.has(pin.placeId) ? (
                    <View
                      pointerEvents="none"
                      style={[
                        // A 60 pt band centred on the point, so a one- or two-line label sits centred beside its pin.
                        { height: 60, justifyContent: 'center', position: 'absolute', top: -30, width: LABEL_WIDTH },
                        (sides.get(pin.placeId) ?? pin.labelSide) === 'end'
                          ? { left: LABEL_OFFSET[labelKind(pin)] }
                          : { left: -LABEL_WIDTH - LABEL_OFFSET[labelKind(pin)] },
                      ]}
                    >
                      <MapLabel
                        dimmed={pin.dimmed}
                        emphasis={labelKind(pin)}
                        side={sides.get(pin.placeId) ?? pin.labelSide}
                        subtitle={pin.count === 1 && pin.ageMin !== null ? ageShortText(t, pin.ageMin) : null}
                        testID={`${testID}-label-${pin.placeId}`}
                        title={pin.count === 1 ? (pin.eventTitle ?? pin.name) : pin.name}
                      />
                    </View>
                  ) : null}
                </MapAnchor>
              );
            })}
          </View>
        </View>
      </GestureDetector>
      {artShown ? (
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { direction: 'ltr' }]} testID={`${testID}-edges`}>
          {squeezed ? (
            <>
              {/* The column's box is its visible part: it ends at the band's foot and scrolls past it; only it takes the drag. */}
              <View
                pointerEvents="box-none"
                style={{ ...column, left: insetLeft + theme.space[4] - SHADOW_PAD }}
                onLayout={measureStack('start', columnPad)}
                testID={`${testID}-edges-start`}
              >
                <ScrollView contentContainerStyle={{ ...columnContent, alignItems: 'flex-start' }} showsVerticalScrollIndicator={false} testID={`${testID}-edges-start-scroll`}>
                  {edgeGroups.north.map(renderEdge)}
                  {edgeGroups.west.map(renderEdge)}
                  {otherChip}
                  {edgeGroups.south.map(renderEdge)}
                </ScrollView>
              </View>
              <View
                pointerEvents="box-none"
                style={{ ...column, right: insetRight + theme.space[4] - SHADOW_PAD }}
                onLayout={measureStack('end', columnPad)}
                testID={`${testID}-edges-end`}
              >
                <ScrollView contentContainerStyle={{ ...columnContent, alignItems: 'flex-end' }} showsVerticalScrollIndicator={false} testID={`${testID}-edges-end-scroll`}>
                  {edgeGroups.east.map(renderEdge)}
                </ScrollView>
              </View>
            </>
          ) : (
            <>
              <View pointerEvents="box-none" style={{ ...stack, left: insetLeft + theme.space[4], top: bandTop }} onLayout={measureStack('north')} testID={`${testID}-edges-north`}>
                {edgeGroups.north.map(renderEdge)}
              </View>
              <View pointerEvents="box-none" style={{ ...stack, left: insetLeft + theme.space[4], top: '42%' }} onLayout={measureStack('west')} testID={`${testID}-edges-west`}>
                {edgeGroups.west.map(renderEdge)}
              </View>
              <View pointerEvents="box-none" style={{ ...stack, right: insetRight + theme.space[4], top: '42%' }} onLayout={measureStack('east')} testID={`${testID}-edges-east`}>
                {edgeGroups.east.map(renderEdge)}
              </View>
              <View pointerEvents="box-none" style={{ ...stack, bottom: insets.bottom, left: insetLeft + theme.space[4] }} onLayout={measureStack('south')} testID={`${testID}-edges-south`}>
                {otherChip}
                {edgeGroups.south.map(renderEdge)}
              </View>
            </>
          )}
        </View>
      ) : null}
    </Animated.View>
  );
}
