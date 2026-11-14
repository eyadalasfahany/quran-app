import type { SeerahMapZoom } from '../types';
import {
  centerOn,
  clampScale,
  clampView,
  edgeDirection,
  fanOutActive,
  isOnScreen,
  levelSwitch,
  pinchView,
  ringPositions,
  spotAction,
  toContent,
  toScreen,
} from './zoom';

const region: SeerahMapZoom = { min: 0.32, default: 0.6, max: 2.4, cityThreshold: 1.8, fanOut: null };
const city: SeerahMapZoom = { min: 0.39, default: 0.6, max: 3, cityThreshold: null, fanOut: 2.2 };
const viewport = { width: 390, height: 844 };

describe('scale', () => {
  it.each([
    [0.1, 0.32],
    [1, 1],
    [9, 2.4],
  ])('clamps %p to %p', (scale, expected) => {
    expect(clampScale(scale, region)).toBe(expected);
  });
});

describe('screen and content points', () => {
  it('round-trips', () => {
    const view = { scale: 0.6, tx: -120, ty: 40 };
    const screen = toScreen(view, { x: 500, y: 700 });
    expect(screen).toEqual({ x: 180, y: 460 });
    expect(toContent(view, screen)).toEqual({ x: 500, y: 700 });
  });

  it('centres a content point', () => {
    const view = centerOn({ x: 800, y: 1200 }, 0.6, viewport);
    expect(toScreen(view, { x: 800, y: 1200 })).toEqual({ x: 195, y: 422 });
  });
});

describe('clampView', () => {
  const content = { width: 1644, height: 2400 };

  it('leaves no gap at the edges', () => {
    const view = clampView({ scale: 0.6, tx: 500, ty: 500 }, content, viewport);
    expect(view.tx).toBe(0);
    expect(view.ty).toBe(0);
    const far = clampView({ scale: 0.6, tx: -9999, ty: -9999 }, content, viewport);
    expect(far.tx).toBeCloseTo(viewport.width - content.width * 0.6);
    expect(far.ty).toBeCloseTo(viewport.height - content.height * 0.6);
  });

  it('centres art smaller than the window', () => {
    const view = clampView({ scale: 0.1, tx: 0, ty: 0 }, content, viewport);
    expect(view.tx).toBeCloseTo((viewport.width - 164.4) / 2);
  });
});

describe('pinchView', () => {
  it('keeps the focal point still', () => {
    const start = { scale: 0.6, tx: -100, ty: -200 };
    const focal = { x: 200, y: 300 };
    const before = toContent(start, focal);
    const next = pinchView(start, 2, focal, region);
    expect(next.scale).toBeCloseTo(1.2);
    const after = toContent(next, focal);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('stops at the zoom bounds', () => {
    expect(pinchView({ scale: 2, tx: 0, ty: 0 }, 5, { x: 0, y: 0 }, region).scale).toBe(2.4);
    expect(pinchView({ scale: 0.4, tx: 0, ty: 0 }, 0.1, { x: 0, y: 0 }, region).scale).toBe(0.32);
  });
});

describe('levelSwitch', () => {
  it.each([
    ['region', 1.79, true, 'stay'],
    ['region', 1.8, true, 'open-city'],
    ['region', 2.4, false, 'stay'],
    ['city', 0.39, true, 'back-to-region'],
    ['city', 0.397, true, 'back-to-region'],
    ['city', 0.4, true, 'stay'],
    ['city', 0.6, true, 'stay'],
  ] as const)('%s at %p (city under centre %p) is %s', (level, scale, cityUnderCentre, expected) => {
    expect(levelSwitch({ level, scale, zoom: level === 'region' ? region : city, cityUnderCentre })).toBe(expected);
  });
});

describe('fan-out', () => {
  it('is active from the fan-out scale on a city map only', () => {
    expect(fanOutActive(2.1, city)).toBe(false);
    expect(fanOutActive(2.2, city)).toBe(true);
    expect(fanOutActive(2.4, region)).toBe(false);
  });

  it.each([
    [1, 3, 'zoom'],
    [2.2, 6, 'fan-out'],
    [2.2, 7, 'sheet'],
  ] as const)('at scale %p with %i events a tap does %s', (scale, count, expected) => {
    expect(spotAction(scale, city, count)).toBe(expected);
  });

  it('places events evenly on a ring starting at the top', () => {
    const ring = ringPositions(4, 10);
    expect(ring[0]?.x).toBeCloseTo(0);
    expect(ring[0]?.y).toBeCloseTo(-10);
    expect(ring[1]?.x).toBeCloseTo(10);
    expect(ring).toHaveLength(4);
  });
});

describe('edges', () => {
  it.each([
    [{ x: 100, y: -50 }, 'north'],
    [{ x: 100, y: 900 }, 'south'],
    [{ x: -200, y: 400 }, 'west'],
    [{ x: 700, y: 400 }, 'east'],
    [{ x: 100, y: 400 }, null],
  ] as const)('%j is beyond %p', (point, expected) => {
    expect(edgeDirection(point, viewport)).toBe(expected);
  });

  it('isOnScreen honours the margin', () => {
    expect(isOnScreen({ x: -10, y: 10 }, viewport)).toBe(false);
    expect(isOnScreen({ x: -10, y: 10 }, viewport, 20)).toBe(true);
  });
});
