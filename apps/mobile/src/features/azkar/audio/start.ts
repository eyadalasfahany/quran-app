import { pause as pauseQuranPlayback } from '@/features/audio/player';

import type { AzkarDownloadPort } from './downloads';
import type { AzkarPlayerScope } from './azkarPlayerStore';
import type { AzkarQueueItem } from './queue';
import { startAzkarQueue } from './playback';

/**
 * Starts an Azkar queue so only one audio plays. Quran audio is paused through its public `pause()` first; this module
 * never writes the Quran store itself (ADR 0031 §8).
 */
export function startAzkarPlayback(request: {
  scope: AzkarPlayerScope;
  queue: AzkarQueueItem[];
  index: number;
  port?: AzkarDownloadPort;
}): void {
  pauseQuranPlayback();
  startAzkarQueue(request);
}
