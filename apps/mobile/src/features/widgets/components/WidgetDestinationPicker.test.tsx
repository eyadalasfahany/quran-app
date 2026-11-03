import { fireEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { locales, renderUi } from '../../../../jest/render-ui';

import { WidgetDestinationPicker } from './WidgetDestinationPicker';

describe('WidgetDestinationPicker', () => {
  it.each(locales)('renders home and lock labels in %s', async (locale) => {
    Platform.OS = 'ios';
    const view = await renderUi(
      <WidgetDestinationPicker lockEnabled onChange={() => undefined} testID="dest" value="home" />,
      { locale },
    );
    expect(view.getByTestId('dest-segment')).toBeOnTheScreen();
  });

  it('does not show lock-unavailable hint on Android when lock is enabled', async () => {
    Platform.OS = 'android';
    const view = await renderUi(
      <WidgetDestinationPicker lockEnabled onChange={() => undefined} testID="dest" value="home" />,
      { locale: 'ar' },
    );
    expect(view.queryByTestId('dest-lock-hint')).toBeNull();
  });

  it('shows Android lock gallery note when lock is selected', async () => {
    Platform.OS = 'android';
    const view = await renderUi(
      <WidgetDestinationPicker lockEnabled onChange={() => undefined} testID="dest" value="lock" />,
      { locale: 'en' },
    );
    expect(view.getByTestId('dest-lock-hint')).toBeOnTheScreen();
  });

  it('calls onChange when a segment is chosen', async () => {
    Platform.OS = 'ios';
    const onChange = jest.fn();
    const view = await renderUi(
      <WidgetDestinationPicker lockEnabled onChange={onChange} testID="dest" value="home" />,
      { locale: 'en' },
    );
    await fireEvent.press(view.getByText('Lock screen'));
    expect(onChange).toHaveBeenCalledWith('lock');
  });
});
