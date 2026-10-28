import { Platform, Settings } from 'react-native';

import { syncNativeAppLanguage } from './app-language';

describe('syncNativeAppLanguage', () => {
  let set: jest.SpiedFunction<typeof Settings.set>;

  beforeEach(() => {
    set = jest.spyOn(Settings, 'set').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sets AppleLanguages to Arabic on iOS', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');

    syncNativeAppLanguage('ar');

    expect(set).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith({ AppleLanguages: ['ar'] });
  });

  it('sets AppleLanguages to English on iOS when English is saved', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');

    syncNativeAppLanguage('en');

    expect(set).toHaveBeenCalledWith({ AppleLanguages: ['en'] });
  });

  it('does not touch Settings on Android', () => {
    jest.replaceProperty(Platform, 'OS', 'android');

    syncNativeAppLanguage('ar');
    syncNativeAppLanguage('en');

    expect(set).not.toHaveBeenCalled();
  });
});
