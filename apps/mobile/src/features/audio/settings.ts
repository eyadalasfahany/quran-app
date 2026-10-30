import { create } from 'zustand';

import { readSavedReciterId, readWifiOnlyDownloads, writeSavedReciterId, writeWifiOnlyDownloads } from './settings-model';

type AudioSettingsStore = { reciterId: number | null; wifiOnlyDownloads: boolean };

export const useAudioSettings = create<AudioSettingsStore>(() => ({
  reciterId: readSavedReciterId(),
  wifiOnlyDownloads: readWifiOnlyDownloads(),
}));

export function getReciterId(): number | null {
  return readSavedReciterId();
}

export function setReciterId(id: number): void {
  writeSavedReciterId(id);
  useAudioSettings.setState({ reciterId: id });
}

export function getWifiOnlyDownloads(): boolean {
  return readWifiOnlyDownloads();
}

export function setWifiOnlyDownloads(on: boolean): void {
  writeWifiOnlyDownloads(on);
  useAudioSettings.setState({ wifiOnlyDownloads: on });
}

export function resetAudioSettingsStore(): void {
  useAudioSettings.setState({ reciterId: readSavedReciterId(), wifiOnlyDownloads: readWifiOnlyDownloads() });
}
