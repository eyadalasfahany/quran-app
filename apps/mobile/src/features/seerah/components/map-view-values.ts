import { withSpring, type SharedValue, type WithSpringConfig } from 'react-native-reanimated';

import { clampView, pinchView, visibleContentRect, type MapView, type Rect, type Size } from '../logic';
import type { SeerahMapZoom } from '../types';

/** The map's live transform: three shared values the UI thread reads. Helpers here write them (outside the component). */
export type ViewValues = { scale: SharedValue<number>; tx: SharedValue<number>; ty: SharedValue<number> };

export function readView(values: ViewValues): MapView {
  'worklet';
  return { scale: values.scale.value, tx: values.tx.value, ty: values.ty.value };
}

export function writeView(values: ViewValues, view: MapView): void {
  'worklet';
  values.scale.value = view.scale;
  values.tx.value = view.tx;
  values.ty.value = view.ty;
}

/** Moves to `view` with a spring on every value. `onSettled` runs on the UI thread once the spring finishes (not when interrupted). */
export function springView(values: ViewValues, view: MapView, config: WithSpringConfig, onSettled?: () => void): void {
  'worklet';
  values.scale.value = withSpring(view.scale, config);
  values.tx.value = withSpring(view.tx, config);
  values.ty.value = withSpring(view.ty, config, (finished) => {
    'worklet';
    if (finished && onSettled !== undefined) {
      onSettled();
    }
  });
}

/**
 * After a pan or pinch: the view (already clamped during the gesture) settles with a spring, and `onSettled` gets the
 * visible content rectangle once it has. The crisp overlay is drawn from that rectangle.
 */
export function settleValues(
  values: ViewValues,
  content: Size,
  viewport: Size,
  config: WithSpringConfig,
  onSettled: (rect: Rect) => void,
): void {
  'worklet';
  const view = clampView(readView(values), content, viewport);
  const rect = visibleContentRect(view, viewport, content);
  springView(values, view, config, () => {
    'worklet';
    onSettled(rect);
  });
}

/** One pan step: moves by the finger's change and keeps the art covering the window. */
export function panValues(values: ViewValues, change: { x: number; y: number }, content: Size, viewport: Size): void {
  'worklet';
  const view = readView(values);
  writeView(values, clampView({ ...view, tx: view.tx + change.x, ty: view.ty + change.y }, content, viewport));
}

/** One pinch step around the fingers' centre, within the zoom bounds. */
export function pinchValues(
  values: ViewValues,
  scaleChange: number,
  focal: { x: number; y: number },
  zoom: Pick<SeerahMapZoom, 'min' | 'max'>,
  content: Size,
  viewport: Size,
): void {
  'worklet';
  writeView(values, clampView(pinchView(readView(values), scaleChange, focal, zoom), content, viewport));
}
