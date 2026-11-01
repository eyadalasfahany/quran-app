import { pause as pauseQuranPlayback } from '@/features/audio/player';

import type { AzkarRecording } from '../data/model';
import { isPlayableAvailability, type AzkarAudioAvailability } from './availability';
import { playAzkarRecording } from './playback';

/**
 * Starts a unit's recording so only one audio plays. Quran audio is paused through its public `pause()` first; this
 * module never writes the Quran store itself. Nothing is paused or started unless the availability allows playback.
 */
export function startAzkarPlayback(
  recording: AzkarRecording,
  availability: AzkarAudioAvailability,
  options: { unitKey: string; onEnded?: () => void },
): boolean {
  if (!isPlayableAvailability(availability)) {
    return false;
  }
  pauseQuranPlayback();
  return playAzkarRecording(recording, availability, options);
}
