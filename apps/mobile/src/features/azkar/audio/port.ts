import { azkarFileDownloadPort } from './file-download-port';

/** The Azkar download port the app binds in production (ADR 0040). Tests inject `NoAudioDownloadPort` instead. */
export const azkarDownloadPort = azkarFileDownloadPort;
