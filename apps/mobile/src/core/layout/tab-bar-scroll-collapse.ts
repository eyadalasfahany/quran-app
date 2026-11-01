/** Whether main tab screens should hide the tab bar while scrolling down. */
export function tabBarScrollCollapseEnabled(expanded: boolean, short: boolean): boolean {
  return !expanded && !short;
}
