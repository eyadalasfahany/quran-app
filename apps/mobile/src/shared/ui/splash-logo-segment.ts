export function segmentProgress(value: number, [start, end]: readonly [number, number]): number {
  'worklet';
  if (value <= start) {
    return 0;
  }
  if (value >= end) {
    return 1;
  }
  return (value - start) / (end - start);
}

// Eases a 0 → 1 window in and out (smoothstep), so each splash line starts and settles gently.
export function smoothStep(value: number): number {
  'worklet';
  return value * value * (3 - 2 * value);
}
