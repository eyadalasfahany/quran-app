import { withSpring, type SharedValue, type WithSpringConfig } from 'react-native-reanimated';

import { clampView, pinchView, type MapView, type Size } from '../logic';
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

/** Moves to `view` with a spring on every value. */
export function springView(values: ViewValues, view: MapView, config: WithSpringConfig): void {
  values.scale.value = withSpring(view.scale, config);
  values.tx.value = withSpring(view.tx, config);
  values.ty.value = withSpring(view.ty, config);
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
