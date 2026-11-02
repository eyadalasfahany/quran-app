import type { WidgetMisbaha, WidgetSnapshot } from './types';

/**
 * The snapshot with a new misbaha block. A widget tap uses it so the stored snapshot agrees with the counter at once,
 * without rebuilding the rest (the prayer timeline, the progress) on every tap. Returns a new object.
 */
export function withMisbaha(snapshot: WidgetSnapshot, misbaha: WidgetMisbaha): WidgetSnapshot {
  return { ...snapshot, misbaha: { ...misbaha } };
}
