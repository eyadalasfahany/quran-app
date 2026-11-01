import { useTabBarScrollStore } from './tab-bar-scroll-store';

/** True when scroll-down hiding has pulled the tab bar off screen. */
export function useTabBarHiddenOnScroll(): boolean {
  return useTabBarScrollStore((state) => state.collapsed);
}
