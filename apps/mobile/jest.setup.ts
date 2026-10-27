import { deviceLanguageCode } from './jest/device-language';

jest.mock('@/core/db/content/open', () => ({
  useContentDb: () => ({ ready: true, error: null }),
  openContentDb: () => {
    throw new Error('openContentDb is unavailable under Jest.');
  },
}));

jest.mock('@/core/db/user/open', () => ({
  useUserDb: () => ({ ready: true, error: null }),
  openUserDb: () => {
    throw new Error('openUserDb is unavailable under Jest.');
  },
}));

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

type StoredValue = boolean | number | string;
type ValueListener = (changedKey: string) => void;

function mockCreateMmkv() {
  const memory = new Map<string, StoredValue>();
  const listeners = new Set<ValueListener>();
  const notify = (changedKey: string) => {
    for (const listener of listeners) {
      listener(changedKey);
    }
  };
  return {
    addOnValueChangedListener: (listener: ValueListener) => {
      listeners.add(listener);
      return {
        remove: () => {
          listeners.delete(listener);
        },
      };
    },
    clearAll: () => {
      memory.clear();
    },
    contains: (key: string) => memory.has(key),
    getBoolean: (key: string) => {
      const value = memory.get(key);
      return typeof value === 'boolean' ? value : undefined;
    },
    getString: (key: string) => {
      const value = memory.get(key);
      return typeof value === 'string' ? value : undefined;
    },
    remove: (key: string) => {
      const removed = memory.delete(key);
      notify(key);
      return removed;
    },
    set: (key: string, value: StoredValue) => {
      memory.set(key, value);
      notify(key);
    },
  };
}

jest.mock('react-native-mmkv', () => ({
  createMMKV: () => mockCreateMmkv(),
}));
