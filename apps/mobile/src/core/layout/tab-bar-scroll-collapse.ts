/** Whether main tab screens should hide the tab bar while scrolling down. A short window's rail is never hidden (ADR 0036). */
export function tabBarScrollCollapseEnabled(short: boolean): boolean {
  return !short;
}
