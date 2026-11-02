import * as Haptics from 'expo-haptics';

import { playsTabSelectionHaptic, tabSelectionHaptic } from './tab-selection-haptic';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
}));

describe('playsTabSelectionHaptic', () => {
  it('plays on iOS when the pressed tab was not open', () => {
    expect(playsTabSelectionHaptic('ios', false)).toBe(true);
  });

  it('stays silent on iOS when the open tab is pressed again', () => {
    expect(playsTabSelectionHaptic('ios', true)).toBe(false);
  });

  it('stays silent on Android, which has no tab-change haptic (spec §12)', () => {
    expect(playsTabSelectionHaptic('android', false)).toBe(false);
    expect(playsTabSelectionHaptic('android', true)).toBe(false);
  });

  it('stays silent on web and unknown platforms', () => {
    expect(playsTabSelectionHaptic('web', false)).toBe(false);
  });
});

describe('tabSelectionHaptic', () => {
  beforeEach(() => {
    jest.mocked(Haptics.selectionAsync).mockClear();
  });

  it('fires one selection tick on iOS for a tab that changes', () => {
    tabSelectionHaptic('ios', false);

    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it('fires nothing on iOS for the open tab', () => {
    tabSelectionHaptic('ios', true);

    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
  });

  it('fires nothing on Android', () => {
    tabSelectionHaptic('android', false);

    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
  });

  it('does not let a rejected haptic escape (a device without haptics is not an error)', async () => {
    jest.mocked(Haptics.selectionAsync).mockReturnValueOnce(Promise.reject(new Error('no haptics')));

    expect(() => tabSelectionHaptic('ios', false)).not.toThrow();
    await Promise.resolve();
  });
});
