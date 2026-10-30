import type { HostInstance } from 'react-native';

/**
 * The top of `node` inside `container`, measured natively. The container must be an ancestor of the node within the
 * same list cell (no scroll view between them), so the value is in the list's content space. Null when the native
 * measurement fails.
 */
export function measureWithin(
  node: HostInstance,
  container: HostInstance,
  onMeasured: (top: number | null) => void,
): void {
  node.measureLayout(
    container,
    (_left, top) => onMeasured(top),
    () => onMeasured(null),
  );
}
