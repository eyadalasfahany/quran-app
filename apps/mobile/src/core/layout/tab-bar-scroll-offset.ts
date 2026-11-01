const SCROLL_DOWN_PX = 12;
const SCROLL_UP_PX = 12;
const TOP_RESET_PX = 8;

export type TabBarScrollOffsetState = {
  collapsed: boolean;
  lastY: number;
};

export function nextTabBarScrollOffsetState(
  state: TabBarScrollOffsetState,
  y: number,
): TabBarScrollOffsetState {
  if (y <= TOP_RESET_PX) {
    return { collapsed: false, lastY: y };
  }
  const delta = y - state.lastY;
  if (delta > SCROLL_DOWN_PX) {
    return { collapsed: true, lastY: y };
  }
  if (delta < -SCROLL_UP_PX) {
    return { collapsed: false, lastY: y };
  }
  return { ...state, lastY: y };
}
