import type { SeerahMapZoom } from '../types';

export type MapView = { scale: number; tx: number; ty: number };
export type Size = { width: number; height: number };
export type Point = { x: number; y: number };

export function clampScale(scale: number, zoom: Pick<SeerahMapZoom, 'min' | 'max'>): number {
  'worklet';
  return Math.min(zoom.max, Math.max(zoom.min, scale));
}

/** The map's content is `content` units wide; the view's scale is screen points per unit. */
export function toScreen(view: MapView, point: Point): Point {
  'worklet';
  return { x: point.x * view.scale + view.tx, y: point.y * view.scale + view.ty };
}

export function toContent(view: MapView, point: Point): Point {
  'worklet';
  return { x: (point.x - view.tx) / view.scale, y: (point.y - view.ty) / view.scale };
}

function clampAxis(translate: number, content: number, viewport: number): number {
  'worklet';
  // A map smaller than the window sits centred; a bigger one may not leave a gap at either edge.
  if (content <= viewport) {
    return (viewport - content) / 2;
  }
  return Math.min(0, Math.max(viewport - content, translate));
}

/** Keeps a pan or zoom inside the art: no gap at any edge (the «bounds» of the map). */
export function clampView(view: MapView, content: Size, viewport: Size): MapView {
  'worklet';
  return {
    scale: view.scale,
    tx: clampAxis(view.tx, content.width * view.scale, viewport.width),
    ty: clampAxis(view.ty, content.height * view.scale, viewport.height),
  };
}

/** A pinch: the point under the fingers stays under the fingers while the scale changes. */
export function pinchView(view: MapView, scaleChange: number, focal: Point, zoom: Pick<SeerahMapZoom, 'min' | 'max'>): MapView {
  'worklet';
  const scale = clampScale(view.scale * scaleChange, zoom);
  const ratio = scale / view.scale;
  return { scale, tx: focal.x - (focal.x - view.tx) * ratio, ty: focal.y - (focal.y - view.ty) * ratio };
}

/** The view that shows `scale` with the content point `center` in the middle of the window. */
export function centerOn(center: Point, scale: number, viewport: Size): MapView {
  'worklet';
  return { scale, tx: viewport.width / 2 - center.x * scale, ty: viewport.height / 2 - center.y * scale };
}

/** Whether a pin's screen point lies inside the window, with a margin. */
export function isOnScreen(point: Point, viewport: Size, margin = 0): boolean {
  return point.x >= -margin && point.x <= viewport.width + margin && point.y >= -margin && point.y <= viewport.height + margin;
}

export type EdgeDirection = 'north' | 'south' | 'west' | 'east';

/** Which edge an off-screen point lies beyond, by the largest overshoot; null when it is on screen. */
export function edgeDirection(point: Point, viewport: Size): EdgeDirection | null {
  if (isOnScreen(point, viewport)) {
    return null;
  }
  const over = {
    north: -point.y,
    south: point.y - viewport.height,
    west: -point.x,
    east: point.x - viewport.width,
  };
  return (Object.keys(over) as EdgeDirection[]).reduce((best, key) => (over[key] > over[best] ? key : best), 'north' as EdgeDirection);
}

export type MapLevelSwitch = 'stay' | 'open-city' | 'back-to-region';

/**
 * Level switching on a gesture end. On the region map, a scale at or past `cityThreshold` over a city opens its map. On a
 * city map, pinching out to the minimum returns to the region. Everything else stays.
 */
export function levelSwitch(input: {
  level: 'region' | 'city';
  scale: number;
  zoom: SeerahMapZoom;
  cityUnderCentre: boolean;
}): MapLevelSwitch {
  if (input.level === 'region') {
    return input.zoom.cityThreshold !== null && input.scale >= input.zoom.cityThreshold && input.cityUnderCentre
      ? 'open-city'
      : 'stay';
  }
  return input.scale <= input.zoom.min * 1.02 ? 'back-to-region' : 'stay';
}

/** At the deepest zoom a spot's events fan out on a ring (up to 6); past that, or before it, a tap zooms in or opens the sheet. */
export const FAN_OUT_MAX = 6;

export function fanOutActive(scale: number, zoom: SeerahMapZoom): boolean {
  return zoom.fanOut !== null && scale >= zoom.fanOut;
}

export function spotAction(scale: number, zoom: SeerahMapZoom, eventCount: number): 'zoom' | 'fan-out' | 'sheet' {
  if (!fanOutActive(scale, zoom)) {
    return 'zoom';
  }
  return eventCount <= FAN_OUT_MAX ? 'fan-out' : 'sheet';
}

/** Positions of `count` events on a ring of `radius` around a centre, starting at the top and going clockwise. */
export function ringPositions(count: number, radius: number): Point[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / Math.max(count, 1);
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
}
