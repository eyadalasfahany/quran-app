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
