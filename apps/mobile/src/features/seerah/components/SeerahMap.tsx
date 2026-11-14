import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import Svg, { SvgXml } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { spring, useDissolve } from '@/core/theme/motion';
import { UiText } from '@/shared/ui';

import { ageRangeText, ageText, eventCountText } from '../format';
import {
  centerOn,
  clampScale,
  clampView,
  clusterPins,
  edgeDirection,
  estimateLabelWidth,
  isOnScreen,
  levelSwitch,
  placeLabels,
  toContent,
  toScreen,
  type EdgeDirection,
  type MapView,
  type PinCluster,
} from '../logic';
import type { SeerahAreaLabel, SeerahMapPin, SeerahMapZoom, SeerahRoutePath } from '../types';

import { ClusterPin } from './ClusterPin';
import { CounterScaled } from './CounterScaled';
import { EdgeChip } from './EdgeChip';
import { MapLabel } from './MapLabel';
import { MapPin } from './MapPin';
import { panValues, pinchValues, springView, writeView, type ViewValues } from './map-view-values';
import { RouteLine } from './RouteLine';

const OFFSCREEN_MARGIN = 60;
const CITY_CENTRE_RADIUS = 90;
const LABEL_FONT = 17;
const CLUSTER_ZOOM = 2.2;

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
   * A place to centre on (the event page's «show on map»). The map pans to its pin once each time it changes, animated
   * unless Reduce Motion is on. Selecting a pin does not pan: only this does.
   */
  focusPlaceId?: string | null;
  /** The map is drawn under the header and the timeline; edge chips keep clear of them. */
  insets?: { top: number; bottom: number };
  /** A single place (or one event) was tapped; `scale` tells the screen if the fan-out is active. */
  onPinPress: (placeId: string, scale: number) => void;
  /** A city with its own map was tapped, or pinched into. */
  onCityOpen: (levelId: string, placeId: string) => void;
  /** On a city map, pinch out to the minimum asks for the region map. */
  onBackToRegion?: () => void;
  onOtherPress: () => void;
  testID?: string;
};

type Item = { cluster: PinCluster; pin: SeerahMapPin | null; screen: { x: number; y: number } };

/**
 * The map of a level (frames SeerahMapRegion, SeerahMapMakkah, SeerahMapMadinah): static SVG art under one shared pan and
 * pinch transform. Pins, clusters, labels and the route strokes are native views on top. They are anchored at their
 * content point and counter-scaled, so they keep their size in points. The transform runs on the UI thread; the cluster
 * and label passes run when a gesture ends, on a `view` snapshot. The map is never mirrored. Reduce Motion: the level
 * change is a cross-fade (it is a cross-fade without it too: the zoom-into-the-city animation is not drawn).
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

  const startCentre = useMemo(() => {
    // The first view centres on the places with events; regions (Sham, Abyssinia) are edge chips, not a reason to scroll.
    const counted = pins.filter((pin) => pin.count > 0 && pin.kind !== 'region');
    const from = counted.length > 0 ? counted : pins;
    return from.length === 0
      ? { x: content.width / 2, y: content.height / 2 }
      : {
          x: from.reduce((sum, pin) => sum + pin.x, 0) / from.length,
          y: from.reduce((sum, pin) => sum + pin.y, 0) / from.length,
        };
    // The start view is the level's own; it must not move when the pins' counts change with the focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId]);

  const initial = useMemo(
    () => clampView(centerOn(startCentre, zoom.default, size), content, size),
    [startCentre, zoom.default, size, content],
  );
  const [view, setView] = useState<MapView>(initial);
  const scale = useSharedValue(initial.scale);
  const tx = useSharedValue(initial.tx);
  const ty = useSharedValue(initial.ty);
  const values = useMemo<ViewValues>(() => ({ scale, tx, ty }), [scale, tx, ty]);

  const apply = useCallback(
    (next: MapView, animate: boolean) => {
      const clamped = clampView({ ...next, scale: clampScale(next.scale, zoom) }, content, size);
      if (animate && !reduceMotion) {
        springView(values, clamped, spring());
      } else {
        writeView(values, clamped);
      }
      setView(clamped);
    },
    [content, reduceMotion, size, values, zoom],
  );

  const onLayout = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    if (width === size.width && height === size.height) {
      return;
    }
    // A resize keeps the content point at the middle of the window.
    const middle = toContent(view, { x: size.width / 2, y: size.height / 2 });
    const next = { height, width };
    setSize(next);
    const resized = clampView(centerOn(middle, view.scale, next), content, next);
    writeView(values, resized);
    setView(resized);
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

  const pan = usePanGesture({
    onUpdate: (event) => {
      'worklet';
      panValues(values, { x: event.changeX, y: event.changeY }, content, size);
    },
    onDeactivate: () => {
      'worklet';
      scheduleOnRN(commit, scale.value, tx.value, ty.value);
    },
  });
  const pinch = usePinchGesture({
    onUpdate: (event) => {
      'worklet';
      pinchValues(values, event.scaleChange, { x: event.focalX, y: event.focalY }, zoom, content, size);
    },
    onDeactivate: () => {
      'worklet';
      scheduleOnRN(commit, scale.value, tx.value, ty.value);
    },
  });
  const gesture = useSimultaneousGestures(pan, pinch);

  const layerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  const { items, edges, labels } = useMemo(() => {
    const placed = pins.map((pin) => ({ pin, screen: toScreen(view, pin) }));
    const visible = placed.filter(({ screen }) => isOnScreen(screen, size, OFFSCREEN_MARGIN));
    const edgeChips = placed
      .filter(({ pin, screen }) => pin.kind === 'region' && pin.count > 0 && !isOnScreen(screen, size))
      .flatMap(({ pin, screen }) => {
        const direction = edgeDirection(screen, size);
        return direction === null ? [] : [{ direction, pin }];
      });
    const counted = visible.filter(({ pin }) => pin.count > 0);
    const clusters = clusterPins(counted.map(({ pin, screen }) => ({ count: pin.count, id: pin.placeId, order: pin.order, x: screen.x, y: screen.y })));
    const byId = new Map(pins.map((pin) => [pin.placeId, pin]));
    const clusterItems: Item[] = clusters.map((cluster) => ({
      cluster,
      pin: cluster.memberIds.length === 1 ? (byId.get(cluster.id) ?? null) : null,
      screen: { x: cluster.x, y: cluster.y },
    }));
    // A landmark with no events is orientation only: drawn when nothing else is within reach of it.
    const empties = visible
      .filter(({ pin }) => pin.count === 0)
      .filter(({ screen }) => clusterItems.every((item) => Math.hypot(item.screen.x - screen.x, item.screen.y - screen.y) >= 44))
      .map(({ pin, screen }): Item => ({ cluster: { count: 0, id: pin.placeId, memberIds: [pin.placeId], x: screen.x, y: screen.y }, pin, screen }));
    const all = [...clusterItems, ...empties];
    const candidates = all.flatMap((item) => {
      if (item.pin === null || item.pin.count === 0) {
        return [];
      }
      const text = item.pin.count === 1 ? (item.pin.eventTitle ?? item.pin.name) : item.pin.name;
      return [
        {
          count: item.pin.count,
          height: item.pin.count === 1 ? 40 : 26,
          id: item.pin.placeId,
          order: item.pin.order,
          priority: item.pin.labelPriority,
          side: item.pin.labelSide,
          width: estimateLabelWidth(text, LABEL_FONT),
          x: item.screen.x,
          y: item.screen.y,
        },
      ];
    });
    const { visible: shown } = placeLabels(candidates, all.map((item) => item.screen));
    return { edges: edgeChips, items: all, labels: new Set(shown) };
  }, [pins, size, view]);

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

  const zoomTo = (cluster: PinCluster) => {
    const point = toContent(view, { x: cluster.x, y: cluster.y });
    apply(centerOn(point, Math.min(zoom.max, Math.max(view.scale * CLUSTER_ZOOM, view.scale + 0.2)), size), true);
  };

  const panTo = (pin: SeerahMapPin) => apply(centerOn({ x: pin.x, y: pin.y }, view.scale, size), true);

  // The focused place is panned to once; the guard keeps a re-render (new pins, a new `panTo`) from panning again.
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
    panTo(pin);
  });

  const edgeGroups: Record<EdgeDirection, typeof edges> = { east: [], north: [], south: [], west: [] };
  edges.forEach((edge) => edgeGroups[edge.direction].push(edge));
  const renderEdge = ({ direction, pin }: (typeof edges)[number]) => (
    <EdgeChip
      accessibilityHint={t('seerah.map.edge.hint')}
      accessibilityLabel={t(`seerah.map.edge.${direction}`, { events: eventCountText(t, pin.count), name: pin.name })}
      count={pin.count}
      dimmed={pin.dimmed}
      direction={direction}
      key={pin.placeId}
      label={pin.name}
      onPress={() => panTo(pin)}
      testID={`${testID}-edge-${pin.placeId}`}
    />
  );

  return (
    <Animated.View
      entering={dissolve.entering}
      exiting={dissolve.exiting}
      onLayout={onLayout}
      style={{ backgroundColor: theme.colors.surface, flex: 1, overflow: 'hidden' }}
      testID={testID}
    >
      <GestureDetector gesture={gesture}>
        <View style={StyleSheet.absoluteFill}>
          <Animated.View
            style={[{ height: content.height, left: 0, position: 'absolute', top: 0, transformOrigin: 'top left', width: content.width }, layerStyle]}
            testID={`${testID}-layer`}
          >
            <SvgXml height={content.height} width={content.width} xml={art} />
            <Svg height={content.height} pointerEvents="none" style={StyleSheet.absoluteFill} width={content.width}>
              {routePaths.map((path) => (
                <RouteLine
                  d={path.d}
                  dimmed={dimmedRouteIds.includes(path.routeId)}
                  key={`${path.routeId}-${path.d.slice(0, 24)}`}
                  kind={path.kind}
                  scale={scale}
                  testID={`${testID}-route-${path.routeId}`}
                />
              ))}
            </Svg>
            {areaLabels.map((area) => (
              <CounterScaled key={area.id} scale={scale} x={area.x} y={area.y}>
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
              </CounterScaled>
            ))}
            {items.map((item) => {
              const content0 = toContent(view, item.screen);
              const { pin } = item;
              const selected = pin !== null && pin.placeId === selectedPlaceId;
              return (
                <CounterScaled key={item.cluster.id} scale={scale} testID={`${testID}-item-${item.cluster.id}`} x={content0.x} y={content0.y}>
                  <View style={{ left: -22, position: 'absolute', top: -22 }}>
                    {pin === null ? (
                      <ClusterPin
                        count={item.cluster.count}
                        label={t('seerah.map.pin.cluster', { events: eventCountText(t, item.cluster.count), places: formatNumber(item.cluster.memberIds.length, locale) })}
                        onPress={() => zoomTo(item.cluster)}
                        testID={`${testID}-cluster-${item.cluster.id}`}
                      />
                    ) : pin.count > 1 ? (
                      <ClusterPin
                        count={pin.count}
                        dimmed={pin.dimmed}
                        label={pinLabel(pin)}
                        onPress={() => (pin.opensLevel === null ? onPinPress(pin.placeId, view.scale) : onCityOpen(pin.opensLevel, pin.placeId))}
                        selected={selected}
                        testID={`${testID}-pin-${pin.placeId}`}
                        variant={pin.opensLevel === null ? 'cluster' : 'city'}
                      />
                    ) : (
                      <MapPin
                        dimmed={pin.dimmed}
                        label={pinLabel(pin)}
                        onPress={() => (pin.opensLevel === null ? onPinPress(pin.placeId, view.scale) : onCityOpen(pin.opensLevel, pin.placeId))}
                        selected={selected}
                        testID={`${testID}-pin-${pin.placeId}`}
                        uncertain={pin.uncertain}
                        variant={pin.count === 0 ? 'empty' : 'single'}
                      />
                    )}
                  </View>
                  {pin !== null && labels.has(pin.placeId) ? (
                    <View
                      style={[
                        { position: 'absolute', top: pin.count === 1 ? -20 : -13, width: 220 },
                        pin.labelSide === 'end' ? { left: 28 } : { left: -248 },
                      ]}
                    >
                      <MapLabel
                        dimmed={pin.dimmed}
                        emphasis={pin.opensLevel === null ? 'place' : 'city'}
                        side={pin.labelSide}
                        subtitle={pin.count === 1 && pin.ageMin !== null ? ageText(t, pin.ageMin) : null}
                        testID={`${testID}-label-${pin.placeId}`}
                        title={pin.count === 1 ? (pin.eventTitle ?? pin.name) : pin.name}
                      />
                    </View>
                  ) : null}
                </CounterScaled>
              );
            })}
          </Animated.View>
        </View>
      </GestureDetector>
      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill]}>
        <View pointerEvents="box-none" style={{ gap: theme.space[2], left: theme.space[4], position: 'absolute', top: insets.top }}>
          {edgeGroups.north.map(renderEdge)}
        </View>
        <View pointerEvents="box-none" style={{ gap: theme.space[2], left: theme.space[4], position: 'absolute', top: '42%' }}>
          {edgeGroups.west.map(renderEdge)}
        </View>
        <View pointerEvents="box-none" style={{ gap: theme.space[2], position: 'absolute', right: theme.space[4], top: '42%' }}>
          {edgeGroups.east.map(renderEdge)}
        </View>
        <View pointerEvents="box-none" style={{ bottom: insets.bottom, gap: theme.space[2], left: theme.space[4], position: 'absolute' }}>
          {otherCount > 0 ? (
            <EdgeChip
              accessibilityHint={t('seerah.map.edge.hint')}
              accessibilityLabel={t('seerah.map.other.label', { events: eventCountText(t, otherCount) })}
              count={otherCount}
              direction="other"
              label={t('seerah.map.other.name')}
              onPress={onOtherPress}
              testID={`${testID}-other`}
            />
          ) : null}
          {edgeGroups.south.map(renderEdge)}
        </View>
      </View>
    </Animated.View>
  );
}
