import { create } from 'zustand';

import { readSavedReciterId, writeSavedReciterId } from './settings-model';

type AudioSettingsStore = { reciterId: number | null };

export const useAudioSettings = create<AudioSettingsStore>(() => ({
  reciterId: readSavedReciterId(),
}));

export function getReciterId(): number | null {
  return readSavedReciterId();
}

export function setReciterId(id: number): void {
  writeSavedReciterId(id);
  useAudioSettings.setState({ reciterId: id });
}

export function resetAudioSettingsStore(): void {
  useAudioSettings.setState({ reciterId: readSavedReciterId() });
}
