import { storage, storageKeys } from '@/core/storage/mmkv';

import { getReciterId, resetAudioSettingsStore, setReciterId, useAudioSettings } from './settings';

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
