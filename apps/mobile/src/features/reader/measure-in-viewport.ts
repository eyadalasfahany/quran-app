import type { HostInstance } from 'react-native';

/**
 * The top of `node` inside `viewport`, as it is on screen (a native measurement, so it is right at any scroll
 * offset). The follow-scroll is the only caller; tests stand in for it.
 */
export function measureInViewport(node: HostInstance, viewport: HostInstance, onMeasured: (top: number) => void): void {
  node.measureLayout(
    viewport,
    (_left, top) => onMeasured(top),
    () => undefined,
  );
}
