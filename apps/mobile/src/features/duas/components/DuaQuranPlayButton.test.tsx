import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { renderUi } from '../../../../jest/render-ui';
import { themes } from '@/core/theme';

import { DuaQuranPlayButton } from './DuaQuranPlayButton';

describe('DuaQuranPlayButton', () => {
  it('is a play button labelled تشغيل when the range is idle', async () => {
    await renderUi(<DuaQuranPlayButton onPress={jest.fn()} state="idle" />);

    expect(screen.getByRole('button', { name: 'تشغيل' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'تشغيل' }).props.accessibilityState).toMatchObject({ disabled: false, busy: undefined });
  });

  it('shows إيقاف while the range plays, so a tap pauses it', async () => {
    await renderUi(<DuaQuranPlayButton onPress={jest.fn()} state="playing" />);

    expect(screen.getByRole('button', { name: 'إيقاف' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'تشغيل' })).toBeNull();
  });

  it('shows the buffering ring and pause while the range starts, and reports the button busy', async () => {
    await renderUi(<DuaQuranPlayButton onPress={jest.fn()} state="starting" />);

    const button = screen.getByRole('button', { name: 'إيقاف' });
    expect(button.props.accessibilityState).toMatchObject({ busy: true });
    // The ring is hidden from screen readers by design (the button carries the busy state).
    expect(screen.getByTestId('dua-quran-play-ring', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('shows تشغيل when paused, so a tap resumes it', async () => {
    await renderUi(<DuaQuranPlayButton onPress={jest.fn()} state="paused" />);

    expect(screen.getByRole('button', { name: 'تشغيل' })).toBeOnTheScreen();
  });

  it('is disabled, and does not press, when the range is unavailable', async () => {
    const onPress = jest.fn();
    await renderUi(<DuaQuranPlayButton onPress={onPress} state="unavailable" />);

    const button = screen.getByRole('button', { name: 'تشغيل' });
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
    expect(StyleSheet.flatten(button.props.style).opacity).toBe(themes.light.opacity?.disabled ?? 0.45);
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('calls onPress on a tap', async () => {
    const onPress = jest.fn();
    await renderUi(<DuaQuranPlayButton onPress={onPress} state="idle" />);

    fireEvent.press(screen.getByRole('button', { name: 'تشغيل' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('paints the control in the brand token, with no raw colour', async () => {
    await renderUi(<DuaQuranPlayButton onPress={jest.fn()} state="idle" />);

    expect(StyleSheet.flatten(screen.getByRole('button', { name: 'تشغيل' }).props.style).backgroundColor).toBe(themes.light.colors.brand);
  });

  it('renders the English labels', async () => {
    await renderUi(<DuaQuranPlayButton onPress={jest.fn()} state="idle" />, { locale: 'en' });

    expect(screen.getByRole('button', { name: 'Play' })).toBeOnTheScreen();
  });

  it('renders the English pause label while it plays', async () => {
    await renderUi(<DuaQuranPlayButton onPress={jest.fn()} state="playing" />, { locale: 'en' });

    expect(screen.getByRole('button', { name: 'Pause' })).toBeOnTheScreen();
  });
});
