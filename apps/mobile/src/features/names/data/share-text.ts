import type { NameDetail } from './model';

/** Share payload: the name bytes and the source line only (ADR 0043 A7). */
export function buildNameShareText(detail: NameDetail): string {
  return `${detail.nameAr}\n${detail.list.sourceLabelAr}`;
}
