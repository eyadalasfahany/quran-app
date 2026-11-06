import { Platform } from 'react-native';

import { NavigationBar } from 'expo-navigation-bar';

import { setAndroidNavigationBarHidden } from './android-navigation-bar';

jest.mock('expo-navigation-bar', () => ({
  NavigationBar: { setHidden: jest.fn() },
}));

const setHidden = jest.mocked(NavigationBar.setHidden);

describe('setAndroidNavigationBarHidden', () => {
  let platform: { restore: () => void } | undefined;

  beforeEach(() => {
    setHidden.mockReset();
    setHidden.mockImplementation(() => undefined);
  });

  afterEach(() => {
    platform?.restore();
    platform = undefined;
  });

  it('hides the Android navigation bar', () => {
    platform = jest.replaceProperty(Platform, 'OS', 'android');

    setAndroidNavigationBarHidden(true);

    expect(setHidden).toHaveBeenCalledTimes(1);
    expect(setHidden).toHaveBeenCalledWith(true);
  });

  it('shows the Android navigation bar again', () => {
    platform = jest.replaceProperty(Platform, 'OS', 'android');

    setAndroidNavigationBarHidden(false);

    expect(setHidden).toHaveBeenCalledWith(false);
  });

  it('does not touch the navigation bar on iOS', () => {
    platform = jest.replaceProperty(Platform, 'OS', 'ios');

    setAndroidNavigationBarHidden(true);
    setAndroidNavigationBarHidden(false);

    expect(setHidden).not.toHaveBeenCalled();
  });

  it('does not throw when the native call throws', () => {
    platform = jest.replaceProperty(Platform, 'OS', 'android');
    setHidden.mockImplementation(() => {
      throw new Error('native module missing');
    });

    expect(() => setAndroidNavigationBarHidden(true)).not.toThrow();
  });

  it('does not throw and does not leak an unhandled rejection when the native call rejects', async () => {
    platform = jest.replaceProperty(Platform, 'OS', 'android');
    const rejected = Promise.reject(new Error('native call failed'));
    setHidden.mockImplementation(() => rejected as unknown as void);

    expect(() => setAndroidNavigationBarHidden(true)).not.toThrow();
    await expect(rejected).rejects.toThrow('native call failed');
  });
});
