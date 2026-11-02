import Constants from 'expo-constants';

import { resetAppGroupStoreModuleForTests } from 'app-group-store';

import {
  iosAppGroupSuiteName,
  iosAppGroupWidgetWriter,
  isIosAppGroupStoreAvailable,
  reloadIosWidgets,
  writeIosWidgetSnapshot,
} from './app-group';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { ios: { bundleIdentifier: 'com.taybahapp.taybah.dev' } } },
}));

const mockWrite = jest.fn(async () => undefined);
const mockReloadWidgets = jest.fn(async () => undefined);
const mockIsAvailable = jest.fn(() => true);

jest.mock('app-group-store', () => {
  const actual = jest.requireActual('app-group-store');
  return {
    ...actual,
    getAppGroupStoreModule: () => ({
      isAvailable: mockIsAvailable,
      reloadWidgets: mockReloadWidgets,
      write: mockWrite,
    }),
  };
});

describe('ios app group writer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAppGroupStoreModuleForTests();
    mockIsAvailable.mockReturnValue(true);
  });

  it('derives the App Group from the bundle id', () => {
    expect(iosAppGroupSuiteName()).toBe('group.com.taybahapp.taybah.dev');
  });

  it('writes JSON and reloads through the native module', async () => {
    await writeIosWidgetSnapshot('{"schemaVersion":1}');
    expect(mockWrite).toHaveBeenCalledWith('group.com.taybahapp.taybah.dev', '{"schemaVersion":1}');
    await reloadIosWidgets();
    expect(mockReloadWidgets).toHaveBeenCalled();
  });

  it('reports availability from the native module', () => {
    expect(isIosAppGroupStoreAvailable()).toBe(true);
    mockIsAvailable.mockReturnValue(false);
    expect(isIosAppGroupStoreAvailable()).toBe(false);
  });

  it('publish writer id is ios-app-group', () => {
    expect(iosAppGroupWidgetWriter.id).toBe('ios-app-group');
  });

  it('throws when bundle id is missing', () => {
    (Constants as { expoConfig?: { ios?: { bundleIdentifier?: string } } }).expoConfig = {};
    expect(() => iosAppGroupSuiteName()).toThrow(/bundleIdentifier/);
    (Constants as { expoConfig?: { ios?: { bundleIdentifier?: string } } }).expoConfig = {
      ios: { bundleIdentifier: 'com.taybahapp.taybah.dev' },
    };
  });
});
