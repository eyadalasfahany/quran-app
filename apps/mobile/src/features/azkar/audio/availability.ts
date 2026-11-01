import type { AzkarRecording } from '../data/model';

/**
 * What a reader may do with one recording (ADR 0031 §8). `none` means no audio controls at all.
 * - `stream`: streaming is allowed and the device is online.
 * - `stream_offline`: streaming is allowed but the device is offline and the recording is not downloaded.
 * - `local`: the recording is downloaded and downloading is allowed.
 */
export type AzkarAudioAvailability = 'none' | 'stream' | 'stream_offline' | 'local';

export type AzkarAudioContext = {
  online: boolean;
  downloaded: boolean;
};

/**
 * The audio state of a recording. A recording whose rights are not verified (`rights_verified_at` null) is `none`,
 * whatever its flags say. Recordings are imported only with verified rights, so this is a second guard.
 */
export function audioAvailability(recording: AzkarRecording | null, context: AzkarAudioContext): AzkarAudioAvailability {
  if (recording === null || recording.rightsVerifiedAt === null) {
    return 'none';
  }

  if (context.downloaded && recording.downloadAllowed) {
    return 'local';
  }

  if (recording.streamAllowed) {
    return context.online ? 'stream' : 'stream_offline';
  }

  return 'none';
}

/** Whether the recording may be downloaded. Rights must be verified first. */
export function canDownload(recording: AzkarRecording | null): boolean {
  return recording !== null && recording.rightsVerifiedAt !== null && recording.downloadAllowed;
}

/** Whether a state can play. `stream_offline` cannot: nothing is local and the network is down. */
export function isPlayableAvailability(availability: AzkarAudioAvailability): boolean {
  return availability === 'stream' || availability === 'local';
}
