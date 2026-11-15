/**
 * The public surface of Azkar audio for other features (ADR 0092 decision 3, which amends ADR 0055 §1). Duas plays a Hisn
 * dua through this file only: it never imports `azkarPlayerStore` or anything under `audio/`
 * (`features/duas/duas-audio-boundary.test.ts`).
 */
export { useAzkarEntryPlayback } from './audio/entry-playback';
export type { AzkarEntryPlayback, AzkarEntryPlayControl, AzkarEntryPlayerBar } from './audio/entry-playback';
export { AzkarDownloadButton } from './components/AzkarDownloadButton';
export { AzkarOfflinePill } from './components/AzkarOfflinePill';
export { AzkarPlayerBar } from './components/AzkarPlayerBar';
export { AzkarPlayerControl } from './components/AzkarPlayerControl';
