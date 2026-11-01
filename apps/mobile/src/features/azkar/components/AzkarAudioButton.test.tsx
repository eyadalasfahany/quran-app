import { screen } from '@testing-library/react-native';

import { makeFakeDownloadPort, makeDownloadEntry, makeRecording } from '../../../../jest/azkar-audio-fixtures';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { useOnline } from '../audio/hooks';
import {
  pauseAzkarRecording,
  playAzkarRecording,
  replayAzkarRecording,
  resetAzkarPlaybackForTests,
  resumeAzkarRecording,
  useAzkarPlaybackStore,
} from '../audio/playback';
import { AzkarAudioButton } from './AzkarAudioButton';

const UNIT = 'fixture:unit-001';

jest.mock('../audio/hooks', () => ({
  ...jest.requireActual<typeof import('../audio/hooks')>('../audio/hooks'),
  useOnline: jest.fn(() => true),
}));

jest.mock('../audio/playback', () => ({
  ...jest.requireActual<typeof import('../audio/playback')>('../audio/playback'),
  playAzkarRecording: jest.fn(() => true),
  pauseAzkarRecording: jest.fn(),
  replayAzkarRecording: jest.fn(),
  resumeAzkarRecording: jest.fn(),
}));

const mockOnline = useOnline as jest.Mock;

describe('AzkarAudioButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnline.mockReturnValue(true);
    resetAzkarPlaybackForTests();
  });

  it('renders nothing without a recording', async () => {
    await renderUi(<AzkarAudioButton recording={null} unitKey={UNIT} />);
    expect(screen.queryByTestId('azkar-audio-button')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders nothing when the rights are not verified, whatever the flags say', async () => {
    await renderUi(<AzkarAudioButton recording={makeRecording({ rightsVerifiedAt: null, streamAllowed: true })} unitKey={UNIT} />);
    expect(screen.queryByTestId('azkar-audio-button')).toBeNull();
    expect(screen.queryByTestId('azkar-audio-button-offline')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders nothing when neither streaming nor downloading is allowed', async () => {
    await renderUi(<AzkarAudioButton recording={makeRecording({ streamAllowed: false, downloadAllowed: false })} unitKey={UNIT} />);
    expect(screen.queryByTestId('azkar-audio-button')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows a play button online when streaming is allowed, and starts the unit recording on press', async () => {
    const recording = makeRecording();
    const onEnded = jest.fn();
    await renderUi(<AzkarAudioButton onEnded={onEnded} recording={recording} unitKey={UNIT} />);

    await press(screen.getByRole('button', { name: 'تشغيل التسجيل' }));
    expect(playAzkarRecording).toHaveBeenCalledWith(recording, 'stream', { unitKey: UNIT, onEnded });
  });

  it('shows the offline pill as real state, with a hint and no button, when streaming is allowed and offline', async () => {
    mockOnline.mockReturnValue(false);
    await renderUi(<AzkarAudioButton recording={makeRecording()} unitKey={UNIT} />);

    expect(screen.getByText('غير متاح دون اتصال')).toBeOnTheScreen();
    const pill = screen.getByLabelText('غير متاح دون اتصال');
    expect(pill.props.accessibilityHint).toBe('يتطلب هذا التسجيل اتصالًا بالإنترنت');
    expect(pill.props.accessibilityRole).toBe('text');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('plays a downloaded recording offline, as local audio', async () => {
    mockOnline.mockReturnValue(false);
    const recording = makeRecording({ downloadAllowed: true });
    const port = makeFakeDownloadPort([makeDownloadEntry({ recording, recordingKey: recording.recordingKey, state: 'done' })]);
    await renderUi(<AzkarAudioButton port={port} recording={recording} unitKey={UNIT} />);

    expect(screen.queryByText('غير متاح دون اتصال')).toBeNull();
    await press(screen.getByRole('button', { name: 'تشغيل التسجيل' }));
    expect(playAzkarRecording).toHaveBeenCalledWith(recording, 'local', expect.objectContaining({ unitKey: UNIT }));
  });

  it('shows pause while this unit plays, and pauses on press', async () => {
    useAzkarPlaybackStore.setState({ unitKey: UNIT, status: 'playing', positionMs: 1000, durationMs: 65000 });
    await renderUi(<AzkarAudioButton recording={makeRecording()} unitKey={UNIT} />);

    await press(screen.getByRole('button', { name: 'إيقاف التسجيل مؤقتًا' }));
    expect(pauseAzkarRecording).toHaveBeenCalledTimes(1);
    expect(playAzkarRecording).not.toHaveBeenCalled();
  });

  it('resumes a paused recording of this unit instead of starting it again', async () => {
    useAzkarPlaybackStore.setState({ unitKey: UNIT, status: 'paused', positionMs: 1000, durationMs: 65000 });
    await renderUi(<AzkarAudioButton recording={makeRecording()} unitKey={UNIT} />);

    await press(screen.getByRole('button', { name: 'تشغيل التسجيل' }));
    expect(resumeAzkarRecording).toHaveBeenCalledTimes(1);
    expect(playAzkarRecording).not.toHaveBeenCalled();
  });

  it('replays through resume after the recording finished', async () => {
    useAzkarPlaybackStore.setState({ unitKey: UNIT, status: 'finished', positionMs: 65000, durationMs: 65000 });
    await renderUi(<AzkarAudioButton recording={makeRecording()} unitKey={UNIT} />);

    await press(screen.getByRole('button', { name: 'تشغيل التسجيل' }));
    expect(resumeAzkarRecording).toHaveBeenCalledTimes(1);
    expect(replayAzkarRecording).not.toHaveBeenCalled();
  });

  it('shows play for another unit even while a recording of a different unit plays', async () => {
    useAzkarPlaybackStore.setState({ unitKey: 'fixture:unit-other', status: 'playing', positionMs: 0, durationMs: 1000 });
    await renderUi(<AzkarAudioButton recording={makeRecording()} unitKey={UNIT} />);

    expect(screen.getByRole('button', { name: 'تشغيل التسجيل' })).toBeOnTheScreen();
  });

  it('labels the controls in English', async () => {
    await renderUi(<AzkarAudioButton recording={makeRecording()} unitKey={UNIT} />, { locale: 'en' });
    expect(screen.getByRole('button', { name: 'Play recording' })).toBeOnTheScreen();
  });

  it('labels the offline pill in English', async () => {
    mockOnline.mockReturnValue(false);
    await renderUi(<AzkarAudioButton recording={makeRecording()} unitKey={UNIT} />, { locale: 'en' });
    expect(screen.getByLabelText('Not available offline')).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarAudioButton.tsx')).toEqual([]);
  });
});
