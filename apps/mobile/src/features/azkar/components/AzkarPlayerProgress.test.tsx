import { screen } from '@testing-library/react-native';

import { fire } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';

import { AzkarPlayerProgress } from './AzkarPlayerProgress';

const SEEK = 'azkar-player-progress-seek';

// A drag of `dx` points on a track `width` wide: grant at x0, move to x0 + dx, release.
async function drag(seek: ReturnType<typeof screen.getByTestId>, dx: number, x0 = 100) {
  await fire(seek, 'responderGrant', { nativeEvent: { locationX: x0, pageX: x0 } });
  await fire(seek, 'responderMove', { nativeEvent: { locationX: x0 + dx, pageX: x0 + dx } });
}

describe('AzkarPlayerProgress', () => {
  it('shows the elapsed time and the time remaining, in Arabic digits', async () => {
    await renderUi(<AzkarPlayerProgress durationMs={65_000} positionMs={20_000} />);
    expect(screen.getByTestId('azkar-player-progress-elapsed').props.children).toBe('٠:٢٠');
    expect(screen.getByTestId('azkar-player-progress-remaining').props.children).toBe('-٠:٤٥');
  });

  it('fills the track to the position', async () => {
    await renderUi(<AzkarPlayerProgress durationMs={100_000} positionMs={25_000} />);
    const fill = screen.getByTestId('azkar-player-progress-fill');
    expect(fill.props.style).toEqual(expect.objectContaining({ width: '25%' }));
  });

  it('reads as a progress bar when it cannot seek', async () => {
    await renderUi(<AzkarPlayerProgress durationMs={65_000} positionMs={0} />);
    const readout = screen.getByLabelText('٠:٠٠ من ١:٠٥');
    expect(readout.props.accessibilityRole).toBe('progressbar');
    expect(readout.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 0 });
  });

  it('is an adjustable seek control when it can seek', async () => {
    await renderUi(<AzkarPlayerProgress durationMs={65_000} onSeek={jest.fn()} positionMs={0} />);
    const seek = screen.getByRole('adjustable', { name: 'موضع التشغيل' });
    expect(seek.props.accessibilityActions).toEqual([{ name: 'increment' }, { name: 'decrement' }]);
  });

  it('steps by 10 seconds through the accessibility actions', async () => {
    const onSeek = jest.fn();
    await renderUi(<AzkarPlayerProgress durationMs={65_000} onSeek={onSeek} positionMs={20_000} />);
    const seek = screen.getByRole('adjustable', { name: 'موضع التشغيل' });

    await fire(seek, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(onSeek).toHaveBeenLastCalledWith(30_000);

    await fire(seek, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    expect(onSeek).toHaveBeenLastCalledWith(10_000);
  });

  it('never steps past the ends of the recording', async () => {
    const onSeek = jest.fn();
    await renderUi(<AzkarPlayerProgress durationMs={65_000} onSeek={onSeek} positionMs={60_000} />);
    await fire(screen.getByRole('adjustable', { name: 'موضع التشغيل' }), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(onSeek).toHaveBeenLastCalledWith(65_000);
  });

  it('a tap seeks to the tapped fraction once the track has a width', async () => {
    const onSeek = jest.fn();
    await renderUi(<AzkarPlayerProgress durationMs={100_000} onSeek={onSeek} positionMs={0} />);
    const track = screen.getByTestId('azkar-player-progress-track');
    await fire(track, 'layout', { nativeEvent: { layout: { width: 200, height: 4, x: 0, y: 0 } } });

    await fire(screen.getByTestId(SEEK), 'responderGrant', { nativeEvent: { locationX: 50, pageX: 50 } });
    await fire(screen.getByTestId(SEEK), 'responderRelease');
    // Arabic reads from the right, so a tap at 50 of 200 from the start edge is 75% of the way through.
    expect(onSeek).toHaveBeenCalledTimes(1);
    expect(onSeek).toHaveBeenCalledWith(75_000);
  });

  it('drags towards the end in Arabic: a leftward drag moves forward, and the seek is sent once on release', async () => {
    const onSeek = jest.fn();
    await renderUi(<AzkarPlayerProgress durationMs={100_000} onSeek={onSeek} positionMs={0} />);
    await fire(screen.getByTestId('azkar-player-progress-track'), 'layout', { nativeEvent: { layout: { width: 200, height: 4, x: 0, y: 0 } } });
    const seek = screen.getByTestId(SEEK);

    await drag(seek, -50);
    expect(onSeek).not.toHaveBeenCalled();
    await fire(seek, 'responderRelease');

    expect(onSeek).toHaveBeenCalledTimes(1);
    expect(onSeek).toHaveBeenCalledWith(25_000);
  });

  it('drags towards the end in English to the same fraction', async () => {
    const onSeek = jest.fn();
    await renderUi(<AzkarPlayerProgress durationMs={100_000} onSeek={onSeek} positionMs={0} />, { locale: 'en' });
    await fire(screen.getByTestId('azkar-player-progress-track'), 'layout', { nativeEvent: { layout: { width: 200, height: 4, x: 0, y: 0 } } });
    const seek = screen.getByTestId(SEEK);

    await drag(seek, 50);
    await fire(seek, 'responderRelease');

    expect(onSeek).toHaveBeenCalledTimes(1);
    expect(onSeek).toHaveBeenCalledWith(25_000);
  });

  it('the fill and the elapsed label follow the finger during a drag', async () => {
    await renderUi(<AzkarPlayerProgress durationMs={100_000} onSeek={jest.fn()} positionMs={0} />, { locale: 'en' });
    await fire(screen.getByTestId('azkar-player-progress-track'), 'layout', { nativeEvent: { layout: { width: 200, height: 4, x: 0, y: 0 } } });

    await drag(screen.getByTestId(SEEK), 50);

    expect(screen.getByTestId('azkar-player-progress-fill').props.style).toEqual(expect.objectContaining({ width: '25%' }));
    expect(screen.getByTestId('azkar-player-progress-elapsed').props.children).toBe('0:25');
    expect(screen.getByTestId('azkar-player-progress-remaining').props.children).toBe('-1:15');
  });

  it('a drag never seeks while the duration is unknown', async () => {
    const onSeek = jest.fn();
    await renderUi(<AzkarPlayerProgress durationMs={0} onSeek={onSeek} positionMs={0} />, { locale: 'en' });
    const seek = screen.getByTestId(SEEK);

    expect(seek.props.onStartShouldSetResponder()).toBe(false);
    await drag(seek, 50);
    await fire(seek, 'responderRelease');
    expect(onSeek).not.toHaveBeenCalled();
  });

  it('does not seek with no known duration', async () => {
    const onSeek = jest.fn();
    await renderUi(<AzkarPlayerProgress durationMs={0} onSeek={onSeek} positionMs={0} />);
    const seek = screen.getByRole('adjustable', { name: 'موضع التشغيل' });
    expect(seek.props.accessibilityState).toEqual({ disabled: true });
    await fire(seek, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(onSeek).not.toHaveBeenCalled();
  });

  it('uses the English labels under English', async () => {
    await renderUi(<AzkarPlayerProgress durationMs={65_000} onSeek={jest.fn()} positionMs={0} />, { locale: 'en' });
    expect(screen.getByRole('adjustable', { name: 'Playback position' })).toBeTruthy();
    expect(screen.getByTestId('azkar-player-progress-remaining').props.children).toBe('-1:05');
  });
});
