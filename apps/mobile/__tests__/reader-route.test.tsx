import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { router } from 'expo-router';

describe('reader route', () => {
  it('opens read/2:255 at that ayah and returns to the tab that opened it', async () => {
    const view = await renderRouter('./app');

    await act(async () => {
      router.navigate('/(main)/(mushaf)');
    });
    await act(async () => {
      router.push('/read/2:255');
    });

    expect(screen.getByTestId('reader-screen').props.accessibilityLabel).toBe('2:255');

    await act(async () => {
      fireEvent.press(screen.getByTestId('reader-back'));
    });

    expect(view.getSegments()).toEqual(['(main)', '(mushaf)']);
  });

  it('opens the settings sheet and the ayah sheet from the reader', async () => {
    await renderRouter('./app');

    await act(async () => {
      router.push('/read/2:255');
    });
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Reading settings'));
    });
    expect(screen.getByTestId('reader-settings-sheet')).toBeOnTheScreen();

    await act(async () => {
      router.back();
    });
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Ayah actions'));
    });

    expect(screen.getByTestId('sheet-container')).toBeOnTheScreen();
    expect(screen.getByText('2:255')).toBeOnTheScreen();
  });
});
