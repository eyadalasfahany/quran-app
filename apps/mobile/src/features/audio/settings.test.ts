import { storage, storageKeys } from '@/core/storage/mmkv';

import {
  getReciterId,
  getWifiOnlyDownloads,
  resetAudioSettingsStore,
  setReciterId,
  setWifiOnlyDownloads,
  useAudioSettings,
} from './settings';

describe('audio settings', () => {
  beforeEach(() => {
    storage.remove(storageKeys.audioReciterId);
    resetAudioSettingsStore();
  });

  it('starts with no reciter when nothing is stored', () => {
    expect(getReciterId()).toBeNull();
    expect(useAudioSettings.getState().reciterId).toBeNull();
  });

  it('writes the choice to MMKV and the store, and reads it back after a reset', () => {
    setReciterId(31);

    expect(useAudioSettings.getState().reciterId).toBe(31);
    expect(storage.getString(storageKeys.audioReciterId)).toBe('31');

    resetAudioSettingsStore();
    expect(useAudioSettings.getState().reciterId).toBe(31);
    expect(getReciterId()).toBe(31);
  });
});

describe('wifi only downloads setting', () => {
  beforeEach(() => {
    storage.remove(storageKeys.audioWifiOnlyDownloads);
    resetAudioSettingsStore();
  });

  it('is on until the reader turns it off', () => {
    expect(getWifiOnlyDownloads()).toBe(true);
    expect(useAudioSettings.getState().wifiOnlyDownloads).toBe(true);
  });

  it('writes the choice to MMKV and reads it back after a reset', () => {
    setWifiOnlyDownloads(false);

    expect(useAudioSettings.getState().wifiOnlyDownloads).toBe(false);
    expect(storage.getBoolean(storageKeys.audioWifiOnlyDownloads)).toBe(false);

    resetAudioSettingsStore();
    expect(getWifiOnlyDownloads()).toBe(false);
    expect(useAudioSettings.getState().wifiOnlyDownloads).toBe(false);
  });
});
