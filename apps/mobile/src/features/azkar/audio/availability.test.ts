import { makeRecording } from '../../../../jest/azkar-audio-fixtures';
import { audioAvailability, canDownload, isPlayableAvailability } from './availability';

type Row = {
  stream: boolean;
  download: boolean;
  online: boolean;
  downloaded: boolean;
  expected: 'stream' | 'stream_offline' | 'local' | 'none';
};

// Every combination of the stream and download flags, connectivity and the downloaded state, with rights verified.
// Rules: downloaded and downloadable is local; else streamable is stream (online) or stream_offline (offline); else none.
const VERIFIED: Row[] = [
  { stream: true, download: true, online: true, downloaded: true, expected: 'local' },
  { stream: true, download: true, online: true, downloaded: false, expected: 'stream' },
  { stream: true, download: true, online: false, downloaded: true, expected: 'local' },
  { stream: true, download: true, online: false, downloaded: false, expected: 'stream_offline' },
  { stream: true, download: false, online: true, downloaded: true, expected: 'stream' },
  { stream: true, download: false, online: true, downloaded: false, expected: 'stream' },
  { stream: true, download: false, online: false, downloaded: true, expected: 'stream_offline' },
  { stream: true, download: false, online: false, downloaded: false, expected: 'stream_offline' },
  { stream: false, download: true, online: true, downloaded: true, expected: 'local' },
  { stream: false, download: true, online: true, downloaded: false, expected: 'none' },
  { stream: false, download: true, online: false, downloaded: true, expected: 'local' },
  { stream: false, download: true, online: false, downloaded: false, expected: 'none' },
  { stream: false, download: false, online: true, downloaded: true, expected: 'none' },
  { stream: false, download: false, online: true, downloaded: false, expected: 'none' },
  { stream: false, download: false, online: false, downloaded: true, expected: 'none' },
  { stream: false, download: false, online: false, downloaded: false, expected: 'none' },
];

describe('audioAvailability', () => {
  it.each(VERIFIED)(
    'verified rights: stream=$stream download=$download online=$online downloaded=$downloaded is $expected',
    ({ stream, download, online, downloaded, expected }) => {
      const recording = makeRecording({ streamAllowed: stream, downloadAllowed: download, rightsVerifiedAt: 1_700_000_000 });
      expect(audioAvailability(recording, { online, downloaded })).toBe(expected);
    },
  );

  it('is none for every flag combination when the rights are not verified', () => {
    for (const stream of [true, false]) {
      for (const download of [true, false]) {
        for (const online of [true, false]) {
          for (const downloaded of [true, false]) {
            const recording = makeRecording({ streamAllowed: stream, downloadAllowed: download, rightsVerifiedAt: null });
            expect(audioAvailability(recording, { online, downloaded })).toBe('none');
          }
        }
      }
    }
  });

  it('is none without a recording, whatever the connectivity', () => {
    expect(audioAvailability(null, { online: true, downloaded: false })).toBe('none');
    expect(audioAvailability(null, { online: false, downloaded: true })).toBe('none');
  });

  it('never reports local unless the recording is downloadable', () => {
    const recording = makeRecording({ streamAllowed: false, downloadAllowed: false });
    expect(audioAvailability(recording, { online: true, downloaded: true })).toBe('none');
  });
});

describe('canDownload', () => {
  it('is true only for a verified recording with download_allowed', () => {
    expect(canDownload(makeRecording({ downloadAllowed: true }))).toBe(true);
    expect(canDownload(makeRecording({ downloadAllowed: false }))).toBe(false);
    expect(canDownload(makeRecording({ downloadAllowed: true, rightsVerifiedAt: null }))).toBe(false);
    expect(canDownload(null)).toBe(false);
  });
});

describe('isPlayableAvailability', () => {
  it('plays only stream and local', () => {
    expect(isPlayableAvailability('stream')).toBe(true);
    expect(isPlayableAvailability('local')).toBe(true);
    expect(isPlayableAvailability('stream_offline')).toBe(false);
    expect(isPlayableAvailability('none')).toBe(false);
  });
});
