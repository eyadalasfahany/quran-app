import { tabBarScrollCollapseEnabled } from './tab-bar-scroll-collapse';

describe('tabBarScrollCollapseEnabled', () => {
  it('enables scroll hiding for the bottom bar on a phone', () => {
    expect(tabBarScrollCollapseEnabled(false)).toBe(true);
  });

  it('disables scroll hiding while the tabs are the rail, a short window or a tablet (ADR 0036, ADR 0051 as amended)', () => {
    expect(tabBarScrollCollapseEnabled(true)).toBe(false);
  });
});
