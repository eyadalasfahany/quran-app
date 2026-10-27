import { deviceLanguageCode } from './jest/device-language';

const mockDeviceLanguageCode = deviceLanguageCode;

jest.mock('expo-localization', () => ({
  getLocales: () => {
    const languageCode = mockDeviceLanguageCode();
    return [
      {
        languageCode,
        languageTag: languageCode ?? 'ar',
        textDirection: languageCode === 'en' ? 'ltr' : 'rtl',
      },
    ];
  },
}));

jest.mock('expo-updates', () => ({
  reloadAsync: jest.fn(() => Promise.resolve()),
}));

// DevSettings.reload restarts the app. The real module also builds a native emitter that warns in Jest.
jest.mock('react-native/Libraries/Utilities/DevSettings', () => ({
  __esModule: true,
  default: {
    addMenuItem: jest.fn(),
    onFastRefresh: jest.fn(),
    reload: jest.fn(),
  },
}));

jest.mock('react-native-mmkv', () => {
  const memory = new Map<string, boolean | number | string>();
  return {
    createMMKV: () => ({
      clearAll: () => {
        memory.clear();
      },
      contains: (key: string) => memory.has(key),
      getString: (key: string) => {
        const value = memory.get(key);
        return typeof value === 'string' ? value : undefined;
      },
      remove: (key: string) => memory.delete(key),
      set: (key: string, value: boolean | number | string) => {
        memory.set(key, value);
      },
    }),
  };
});
