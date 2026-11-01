import { makeRecording } from '../../../../jest/azkar-audio-fixtures';
import { recordingForUnit } from './recording-for-unit';

describe('recordingForUnit', () => {
  it('returns null when the entry has no recordings', () => {
    expect(recordingForUnit([], [1, 2])).toBeNull();
  });

  it('returns null when no body item of the unit has a recording', () => {
    expect(recordingForUnit([makeRecording({ itemId: 9 })], [1, 2])).toBeNull();
  });

  it('returns the recording of a body item', () => {
    const recording = makeRecording({ itemId: 2, recordingKey: 'fixture:recording-b' });
    expect(recordingForUnit([makeRecording({ itemId: 9 }), recording], [1, 2])).toBe(recording);
  });

  it('returns the first matching recording in entry order', () => {
    const first = makeRecording({ itemId: 1, recordingKey: 'fixture:recording-a' });
    const second = makeRecording({ itemId: 2, recordingKey: 'fixture:recording-b' });
    expect(recordingForUnit([first, second], [2, 1])).toBe(first);
  });
});
