import { resolveAudioUrl } from './audio-url';

const API = 'http://localhost:8000';

describe('resolveAudioUrl', () => {
  it('joins a path to the API base', () => {
    expect(resolveAudioUrl('/api/v1/azkar/audio/0.0.2/OD-001.mp3', API)).toBe(
      'http://localhost:8000/api/v1/azkar/audio/0.0.2/OD-001.mp3',
    );
  });

  it('does not double the slash when the base ends with one', () => {
    expect(resolveAudioUrl('/api/v1/x.mp3', `${API}/`)).toBe('http://localhost:8000/api/v1/x.mp3');
  });

  it('passes an absolute http and https URL through unchanged', () => {
    expect(resolveAudioUrl('https://fixture.invalid/recording-001.mp3', API)).toBe('https://fixture.invalid/recording-001.mp3');
    expect(resolveAudioUrl('HTTP://fixture.invalid/a.mp3', API)).toBe('HTTP://fixture.invalid/a.mp3');
  });

  it('keeps every relative path on our API, never on the upstream host', () => {
    expect(resolveAudioUrl('/api/v1/azkar/audio/0.0.2/OD-002.mp3', API).startsWith('http://localhost:8000/')).toBe(true);
  });

  it('returns an empty string for an empty or non-URL value', () => {
    expect(resolveAudioUrl('   ', API)).toBe('');
    expect(resolveAudioUrl('recording.mp3', API)).toBe('');
  });
});
