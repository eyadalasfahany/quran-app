import { tabBarScrollCollapseEnabled } from './tab-bar-scroll-collapse';

describe('tabBarScrollCollapseEnabled', () => {
  it('enables scroll hiding in a tall window, tablets included (ADR 0051)', () => {
    expect(tabBarScrollCollapseEnabled(false)).toBe(true);
  });

  it('disables scroll hiding on a short window, where the rail stays (ADR 0036)', () => {
    expect(tabBarScrollCollapseEnabled(true)).toBe(false);
  });
});
