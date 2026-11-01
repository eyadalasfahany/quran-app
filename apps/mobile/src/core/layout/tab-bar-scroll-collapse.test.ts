import { tabBarScrollCollapseEnabled } from './tab-bar-scroll-collapse';

describe('tabBarScrollCollapseEnabled', () => {
  it('enables scroll hiding in a tall compact window', () => {
    expect(tabBarScrollCollapseEnabled(false, false)).toBe(true);
  });

  it('disables scroll hiding on expanded windows and short windows', () => {
    expect(tabBarScrollCollapseEnabled(true, false)).toBe(false);
    expect(tabBarScrollCollapseEnabled(false, true)).toBe(false);
  });
});
