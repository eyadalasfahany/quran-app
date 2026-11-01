import { nextTabBarScrollOffsetState } from './tab-bar-scroll-offset';

describe('nextTabBarScrollOffsetState', () => {
  const start = { collapsed: false, lastY: 0 };

  it('collapses when scrolling down and expands when scrolling up', () => {
    let state = start;
    state = nextTabBarScrollOffsetState(state, 20);
    state = nextTabBarScrollOffsetState(state, 40);
    expect(state.collapsed).toBe(true);

    state = nextTabBarScrollOffsetState(state, 20);
    expect(state.collapsed).toBe(false);
  });

  it('expands at the top of the list', () => {
    let state = { collapsed: true, lastY: 100 };
    state = nextTabBarScrollOffsetState(state, 4);
    expect(state.collapsed).toBe(false);
  });
});
