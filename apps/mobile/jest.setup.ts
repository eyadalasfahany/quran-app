import { resetHijriFormatterForTests } from '@/features/hijri/data/hijri-date';

import { createFakeAudioPlaylist as mockCreateFakeAudioPlaylist } from './jest/fake-audio-player';
import { deviceLanguageCode } from './jest/device-language';
import { resetWindowSize } from './jest/window-size';

import '@/core/layout/hide-scroll-indicators';

// The phone frames' size (390 x 844). Without it Jest's default window gives a 1.15 text factor (ADR 0043).
resetWindowSize();

afterEach(() => {
  resetHijriFormatterForTests();
  jest.useRealTimers();
});

// Gesture handler installs its UI-thread bindings through Worklets, which has no UI runtime under Jest.
jest.mock('react-native-gesture-handler/lib/module/handlers/gestures/installUIRuntimeBindings', () => ({
  installUIRuntimeBindings: () => undefined,
}));

jest.mock('@shopify/flash-list', () => ({
  FlashList: jest.requireActual<typeof import('react-native')>('react-native').FlatList,
}));

jest.mock('@/core/db/content/open', () => ({
  useContentDb: () => ({ ready: true, error: null }),
  useContentDbBootstrap: () => ({ ready: true, error: null }),
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

// RN's Settings (NSUserDefaults) is a TurboModule that does not exist under Jest. Stub it so Settings.set is safe to call.
jest.mock('react-native/Libraries/Settings/NativeSettingsManager', () => ({
  __esModule: true,
  default: {
    getConstants: () => ({ settings: {} }),
    setValues: jest.fn(),
    deleteValues: jest.fn(),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  },
}));

jest.mock('expo-audio', () => ({
  createAudioPlaylist: jest.fn((options?: { sources?: { uri?: string }[] }) => mockCreateFakeAudioPlaylist(options?.sources ?? [])),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

// Downloads write under the document directory and watch the network. Tests drive both through the fakes.
jest.mock('expo-file-system', () => jest.requireActual<typeof import('./jest/fake-file-system')>('./jest/fake-file-system').fakeExpoFileSystem);

jest.mock('expo-network', () => ({
  NetworkStateType: {
    BLUETOOTH: 'BLUETOOTH',
    CELLULAR: 'CELLULAR',
    ETHERNET: 'ETHERNET',
    NONE: 'NONE',
    OTHER: 'OTHER',
    UNKNOWN: 'UNKNOWN',
    VPN: 'VPN',
    WIFI: 'WIFI',
    WIMAX: 'WIMAX',
  },
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
  getNetworkStateAsync: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true, type: 'WIFI' })),
}));

jest.mock('expo-updates', () => ({
  isEnabled: false,
  reloadAsync: jest.fn(() => Promise.resolve()),
  checkForUpdateAsync: jest.fn(() => Promise.resolve({ isAvailable: false })),
  fetchUpdateAsync: jest.fn(() => Promise.resolve({ isNew: false })),
  useUpdates: () => ({ isUpdatePending: false, downloadedUpdate: undefined }),
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
    getNumber: (key: string) => {
      const value = memory.get(key);
      return typeof value === 'number' ? value : undefined;
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

// The widget snapshot sync mounts the Azkar progress watcher, which subscribes to table changes. The native
// listener does not exist under Jest, so the subscription returns a handle whose `remove` is a no-op.
jest.mock('expo-sqlite', () => ({
  ...jest.requireActual<typeof import('expo-sqlite')>('expo-sqlite'),
  addDatabaseChangeListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// GPS and heading are native. Route tests mount the Salah tab, so the module
// has to resolve without a device. Feature tests that need a fix override this.
jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3, BestForNavigation: 6, High: 4, Highest: 5, Low: 2, Lowest: 1 },
  PermissionStatus: { DENIED: 'denied', GRANTED: 'granted', UNDETERMINED: 'undetermined' },
  getCurrentPositionAsync: jest.fn(() => Promise.resolve(null)),
  getForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'denied' })),
  getLastKnownPositionAsync: jest.fn(() => Promise.resolve(null)),
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'denied' })),
  watchHeadingAsync: jest.fn(() => Promise.resolve({ remove: jest.fn() })),
}));

// Local notifications are a native module; tests drive them through these fakes.
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
  SchedulableTriggerInputTypes: {
    CALENDAR: 'calendar',
    DATE: 'date',
    DAILY: 'daily',
    WEEKLY: 'weekly',
    TIME_INTERVAL: 'timeInterval',
  },
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  deleteNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  getLastNotificationResponseAsync: jest.fn(() => Promise.resolve(null)),
  getExactAlarmPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  getNotificationChannelsAsync: jest.fn(() => Promise.resolve([])),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  requestExactAlarmPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('scheduled-notification-id')),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve(null)),
  setNotificationHandler: jest.fn(),
}));

// The time picker is a native view. Render a stand-in that keeps the props reachable.
jest.mock('@react-native-community/datetimepicker', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => createElement(View, props),
  };
});
