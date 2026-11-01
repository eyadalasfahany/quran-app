import { fireEvent, screen } from '@testing-library/react-native';

import { makeRecording } from '../../../../jest/azkar-audio-fixtures';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { useOnline } from '../audio/hooks';
import {
  playAzkarRecording,
  replayAzkarRecording,
  resetAzkarPlaybackForTests,
  stopAzkarRecording,
  useAzkarPlaybackStore,
} from '../audio/playback';
import { AzkarAudioPlayer } from './AzkarAudioPlayer';

const UNIT = 'fixture:unit-001';

jest.mock('../audio/hooks', () => ({
  ...jest.requireActual<typeof import('../audio/hooks')>('../audio/hooks'),
  useOnline: jest.fn(() => true),
}));

jest.mock('../audio/playback', () => ({
  ...jest.requireActual<typeof import('../audio/playback')>('../audio/playback'),
  playAzkarRecording: jest.fn(() => true),
  replayAzkarRecording: jest.fn(),
  stopAzkarRecording: jest.fn(),
}));

const mockOnline = useOnline as jest.Mock;

function renderPlayer(props: Partial<Parameters<typeof AzkarAudioPlayer>[0]> = {}) {
  const handlers = {
    onAutoplayChange: jest.fn(),
    onAutoStarted: jest.fn(),
    onEnded: jest.fn(),
  };
  const ui = (
    <AzkarAudioPlayer
      autoStart={false}
      autoplay={false}
      recording={makeRecording()}
      unitKey={UNIT}
      {...handlers}
      {...props}
    />
  );
  return { ui, handlers };
}

describe('AzkarAudioPlayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnline.mockReturnValue(true);
    resetAzkarPlaybackForTests();
  });

  it('renders nothing without a recording', async () => {
    const { ui } = renderPlayer({ recording: null });
    await renderUi(ui);
    expect(screen.queryByTestId('azkar-audio-player')).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('renders nothing when the rights are not verified', async () => {
    const { ui } = renderPlayer({ recording: makeRecording({ rightsVerifiedAt: null }) });
    await renderUi(ui);
    expect(screen.queryByTestId('azkar-audio-player')).toBeNull();
  });

  it('renders nothing offline when the recording is not downloaded', async () => {
    mockOnline.mockReturnValue(false);
    const { ui } = renderPlayer();
    await renderUi(ui);
    expect(screen.queryByTestId('azkar-audio-player')).toBeNull();
  });

  it('shows the progress with elapsed and total time, from zero before anything plays', async () => {
    const { ui } = renderPlayer();
    await renderUi(ui);
    expect(screen.getByRole('progressbar', { name: '٠:٠٠ من ١:٠٥' })).toHaveProp('accessibilityValue', { min: 0, max: 100, now: 0 });
    expect(screen.getByTestId('azkar-audio-player-elapsed')).toHaveTextContent('٠:٠٠');
    expect(screen.getByTestId('azkar-audio-player-total')).toHaveTextContent('١:٠٥');
  });

  it('follows the loaded recording of this unit', async () => {
    useAzkarPlaybackStore.setState({ unitKey: UNIT, status: 'playing', positionMs: 32_500, durationMs: 65_000 });
    const { ui } = renderPlayer();
    await renderUi(ui);
    expect(screen.getByRole('progressbar')).toHaveProp('accessibilityValue', { min: 0, max: 100, now: 50 });
    expect(screen.getByTestId('azkar-audio-player-elapsed')).toHaveTextContent('٠:٣٢');
  });

  it('reads another unit as idle', async () => {
    useAzkarPlaybackStore.setState({ unitKey: 'fixture:unit-other', status: 'playing', positionMs: 32_500, durationMs: 65_000 });
    const { ui } = renderPlayer();
    await renderUi(ui);
    expect(screen.getByRole('progressbar')).toHaveProp('accessibilityValue', { min: 0, max: 100, now: 0 });
  });

  it('reports the autoplay preference and calls back on change', async () => {
    const { ui, handlers } = renderPlayer({ autoplay: false });
    await renderUi(ui);
    const toggle = screen.getByRole('switch', { name: 'تشغيل تلقائي, ينتقل إلى الذكر التالي عند انتهاء التسجيل' });
    expect(toggle.props.accessibilityState).toEqual({ checked: false });
    fireEvent(toggle, 'valueChange', true);
    expect(handlers.onAutoplayChange).toHaveBeenCalledWith(true);
  });

  it('starts the unit recording on replay when nothing is loaded', async () => {
    const recording = makeRecording();
    const { ui } = renderPlayer({ recording });
    await renderUi(ui);

    await press(screen.getByRole('button', { name: 'إعادة التشغيل' }));
    expect(playAzkarRecording).toHaveBeenCalledWith(recording, 'stream', expect.objectContaining({ unitKey: UNIT }));
    expect(replayAzkarRecording).not.toHaveBeenCalled();
  });

  it('replays the loaded recording of this unit', async () => {
    useAzkarPlaybackStore.setState({ unitKey: UNIT, status: 'finished', positionMs: 65_000, durationMs: 65_000 });
    const { ui } = renderPlayer();
    await renderUi(ui);

    await press(screen.getByRole('button', { name: 'إعادة التشغيل' }));
    expect(replayAzkarRecording).toHaveBeenCalledTimes(1);
    expect(playAzkarRecording).not.toHaveBeenCalled();
  });

  it('starts the recording when the reader advanced with autoplay, then clears the flag', async () => {
    const recording = makeRecording();
    const { ui, handlers } = renderPlayer({ autoStart: true, recording });
    await renderUi(ui);

    expect(playAzkarRecording).toHaveBeenCalledTimes(1);
    expect(playAzkarRecording).toHaveBeenCalledWith(recording, 'stream', { unitKey: UNIT, onEnded: expect.any(Function) });
    expect(handlers.onAutoStarted).toHaveBeenCalledTimes(1);
  });

  it('does not start a recording without the autoStart flag', async () => {
    const { ui, handlers } = renderPlayer({ autoStart: false });
    await renderUi(ui);
    expect(playAzkarRecording).not.toHaveBeenCalled();
    expect(handlers.onAutoStarted).not.toHaveBeenCalled();
  });

  it('clears the autoStart flag without starting when the unit has no playable recording', async () => {
    const { ui, handlers } = renderPlayer({ autoStart: true, recording: null });
    await renderUi(ui);
    expect(playAzkarRecording).not.toHaveBeenCalled();
    expect(handlers.onAutoStarted).toHaveBeenCalledTimes(1);
  });

  it('passes the end of the recording to the reader', async () => {
    const { ui, handlers } = renderPlayer({ autoStart: true });
    await renderUi(ui);

    const options = jest.mocked(playAzkarRecording).mock.calls[0]?.[2];
    options?.onEnded?.();
    expect(handlers.onEnded).toHaveBeenCalledTimes(1);
  });

  it('stops this unit recording when the player leaves the reader', async () => {
    useAzkarPlaybackStore.setState({ unitKey: UNIT, status: 'playing', positionMs: 0, durationMs: 65_000 });
    const { ui } = renderPlayer();
    const view = await renderUi(ui);

    view.unmount();
    expect(stopAzkarRecording).toHaveBeenCalledTimes(1);
  });

  it('does not stop another unit recording when it leaves', async () => {
    useAzkarPlaybackStore.setState({ unitKey: 'fixture:unit-other', status: 'playing', positionMs: 0, durationMs: 65_000 });
    const { ui } = renderPlayer();
    const view = await renderUi(ui);

    view.unmount();
    expect(stopAzkarRecording).not.toHaveBeenCalled();
  });

  it('shows the attribution under the player', async () => {
    const { ui } = renderPlayer();
    await renderUi(ui);
    expect(screen.getByText('سطر نسبة تجريبي — ليس ذكرًا')).toBeOnTheScreen();
  });

  it('labels the progress and controls in English', async () => {
    const { ui } = renderPlayer();
    await renderUi(ui, { locale: 'en' });
    expect(screen.getByRole('progressbar', { name: '0:00 of 1:05' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Replay' })).toBeOnTheScreen();
    expect(screen.getByRole('switch', { name: 'Auto-play, Moves to the next dhikr when the recording ends' })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarAudioPlayer.tsx')).toEqual([]);
  });
});
