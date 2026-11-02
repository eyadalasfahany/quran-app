import type { WidgetMisbaha } from '../snapshot/types';

/**
 * One misbaha «+» on the iOS widget (mirrors `countTap` in `features/sibha/data/model.ts` and Android
 * `task-handler.ts`). Updates the snapshot block only; MMKV is merged on foreground via `merge-taps.ts`.
 */
export function misbahaAfterWidgetTap(misbaha: WidgetMisbaha): WidgetMisbaha {
  const count = misbaha.count + 1;
  const widgetTapsTotal = (misbaha.widgetTapsTotal ?? 0) + 1;
  const todayTotal = misbaha.todayTotal + 1;
  if (misbaha.target !== null && count >= misbaha.target) {
    return { ...misbaha, count: 0, todayTotal, widgetTapsTotal };
  }
  return { ...misbaha, count, todayTotal, widgetTapsTotal };
}
