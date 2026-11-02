/**
 * Whether main tab screens should hide the bottom bar while scrolling down. Only the bottom bar hides. The rail (a short
 * window, or a tablet, ADR 0036 and ADR 0051 as amended 2 Nov 2026) is never hidden.
 */
export function tabBarScrollCollapseEnabled(rail: boolean): boolean {
  return !rail;
}
