import { useTabBarScrollStore } from './tab-bar-scroll-store';

describe('useTabBarScrollStore', () => {
  beforeEach(() => {
    useTabBarScrollStore.setState({ collapsed: false, lastY: 0, tracking: false });
  });

  it('reports offsets only while tracking', () => {
    useTabBarScrollStore.getState().reportOffset(40);
    expect(useTabBarScrollStore.getState().collapsed).toBe(false);

    useTabBarScrollStore.getState().setTracking(true);
    useTabBarScrollStore.getState().reportOffset(40);
    expect(useTabBarScrollStore.getState().collapsed).toBe(true);
  });
});
