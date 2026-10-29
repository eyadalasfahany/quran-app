import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import { PlayerProgress } from './PlayerProgress';

const colors = themes.dark.colors;

function renderProgress(props: Partial<React.ComponentProps<typeof PlayerProgress>> = {}, options: { locale?: 'ar' | 'en' } = {}) {
  const onSeek = jest.fn();
  const element = <PlayerProgress durationMs={48_000} onSeek={onSeek} positionMs={24_000} {...props} />;
  return { onSeek, view: renderUi(element, { theme: 'dark', ...options }) };
}

describe('PlayerProgress', () => {
  it('shows elapsed at the start and the file total at the end, in Arabic digits', async () => {
    const { view } = renderProgress({}, { locale: 'ar' });
    const awaited = await view;

    expect(awaited.getByTestId('player-elapsed')).toHaveTextContent('٠:٢٤');
    expect(awaited.getByTestId('player-total')).toHaveTextContent('٠:٤٨');
  });

  it('shows both labels as 0:00 while the duration is unknown, even when a position is set', async () => {
    const { view } = renderProgress({ durationMs: 0, positionMs: 0 }, { locale: 'en' });
    const awaited = await view;

    expect(awaited.getByTestId('player-elapsed')).toHaveTextContent('0:00');
    expect(awaited.getByTestId('player-total')).toHaveTextContent('0:00');
  });

  it('shows the total whenever the duration is known, even at the start of a file', async () => {
    const { view } = renderProgress({ positionMs: 0 }, { locale: 'en' });
    const awaited = await view;

    expect(awaited.getByTestId('player-elapsed')).toHaveTextContent('0:00');
    expect(awaited.getByTestId('player-total')).toHaveTextContent('0:48');
  });

  it('fills the played share from the start edge in the goldOnBrandSurface token', async () => {
    const { view } = renderProgress();
    const awaited = await view;
    const fill = flatStyle(awaited.getByTestId('player-progress-fill').props.style);

    expect(fill.width).toBe('50%');
    expect(fill.backgroundColor).toBe(colors.goldOnBrandSurface);
  });

  it('lays out the times and the track in a plain row, so RTL mirrors them, with elapsed first', async () => {
    const { view } = renderProgress({}, { locale: 'en' });
    const awaited = await view;
    const elapsed = awaited.getByTestId('player-elapsed');
    const total = awaited.getByTestId('player-total');
    const row = awaited.getByTestId('player-total').parent;

    expect(flatStyle(row?.props.style).flexDirection).toBe('row');
    expect(flatStyle(row?.props.style).justifyContent).toBe('space-between');
    expect(elapsed.props.children).toBe('0:24');
    expect(total.props.children).toBe('0:48');
  });

  it('is an adjustable control whose value is the played percentage and the elapsed time', async () => {
    const { view } = renderProgress({}, { locale: 'en' });
    const awaited = await view;
    const track = awaited.getByRole('adjustable', { name: 'Progress' });

    expect(track.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 50, text: '0:24' });
    expect(track.props.accessibilityState).toEqual({ disabled: false });
  });

  it('steps forward and back by 10 seconds through the adjustable actions', async () => {
    const { view, onSeek } = renderProgress({ positionMs: 20_000 }, { locale: 'en' });
    const awaited = await view;
    const track = awaited.getByRole('adjustable', { name: 'Progress' });

    track.props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } });
    expect(onSeek).toHaveBeenLastCalledWith(30_000);
    track.props.onAccessibilityAction({ nativeEvent: { actionName: 'decrement' } });
    expect(onSeek).toHaveBeenLastCalledWith(10_000);
  });

  it('clamps an adjustable step to the start and to the end of the file', async () => {
    const { view, onSeek } = renderProgress({ positionMs: 45_000 }, { locale: 'en' });
    const awaited = await view;
    const track = awaited.getByRole('adjustable', { name: 'Progress' });

    track.props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } });
    expect(onSeek).toHaveBeenLastCalledWith(48_000);
  });

  it('does not seek, and reports disabled, while the duration is unknown', async () => {
    const { view, onSeek } = renderProgress({ durationMs: 0, positionMs: 0 }, { locale: 'en' });
    const awaited = await view;
    const track = awaited.getByRole('adjustable', { name: 'Progress' });

    expect(track.props.accessibilityState).toEqual({ disabled: true });
    track.props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } });
    track.props.onAccessibilityAction({ nativeEvent: { actionName: 'decrement' } });
    expect(onSeek).not.toHaveBeenCalled();
  });

  it.each(locales)('renders in %s without a forced direction', async (locale) => {
    const { view } = renderProgress({}, { locale });
    const awaited = await view;

    expect(awaited.getByRole('adjustable')).toBeOnTheScreen();
    expect(flatStyle(awaited.getByTestId('player-progress').props.style).height).toBe(44);
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/PlayerProgress.tsx')).toEqual([]);
  });
});
