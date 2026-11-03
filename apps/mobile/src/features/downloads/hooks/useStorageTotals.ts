import { useAudioStorageSummary } from './useAudioStorageSummary';
import { useFontStorageBytes } from './useFontStorageBytes';
import { useTafsirStorageSummary } from './useTafsirStorageSummary';

export type StorageTotalsResult = {
  audioBytes: number;
  fontBytes: number;
  tafsirBytes: number;
  totalBytes: number;
  loading: boolean;
};

export function useStorageTotals(): StorageTotalsResult {
  const { bytes: fontBytes, loading } = useFontStorageBytes();
  const { totalBytes: audioBytes } = useAudioStorageSummary();
  const { totalBytes: tafsirBytes } = useTafsirStorageSummary();
  const totalBytes = audioBytes + fontBytes + tafsirBytes;
  return { audioBytes, fontBytes, tafsirBytes, totalBytes, loading };
}
