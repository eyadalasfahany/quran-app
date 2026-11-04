import { fireEvent, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { renderUi } from '../../../../jest/render-ui';

import { storage } from '@/core/storage/mmkv';

import { saveWidgetAddDestination } from '../data/add-prefs';
import { WidgetAddTrigger } from './WidgetAddTrigger';

jest.mock('react-native-android-widget', () => ({
  getWidgetInfo: jest.fn(async () => []),
  requestPinWidget: jest.fn(async () => true),
}));

function mockWidgetNative() {
  return jest.requireMock('react-native-android-widget') as {
    getWidgetInfo: jest.Mock;
    requestPinWidget: jest.Mock;
  };
}

describe('WidgetAddTrigger', () => {
  beforeEach(() => {
    storage.clearAll();
    jest.clearAllMocks();
    Platform.OS = 'android';
    mockWidgetNative().getWidgetInfo.mockResolvedValue([]);
    mockWidgetNative().requestPinWidget.mockResolvedValue(true);
  });

  it('opens confirm before requestPinWidget on Android home', async () => {
    const view = await renderUi(<WidgetAddTrigger catalogId="nextPrayer" testID="add" />);

    await fireEvent.press(view.getByTestId('add'));
    expect(view.getByTestId('add-dialog')).toBeTruthy();
    expect(mockWidgetNative().requestPinWidget).not.toHaveBeenCalled();

    await fireEvent.press(view.getByTestId('add-dialog-confirm'));
    await waitFor(() =>
      expect(mockWidgetNative().requestPinWidget).toHaveBeenCalledWith({ widgetName: 'NextPrayer' }),
    );
  });

  it('shows lock steps on Android without requestPinWidget when destination is lock', async () => {
    saveWidgetAddDestination('lock');
    const view = await renderUi(<WidgetAddTrigger catalogId="nextPrayer" testID="add-lock" />);

    await fireEvent.press(view.getByTestId('add-lock'));
    await fireEvent.press(view.getByTestId('add-lock-dialog-confirm'));

    await waitFor(() => expect(view.getByTestId('add-lock-add-steps-card')).toBeTruthy());
    expect(mockWidgetNative().requestPinWidget).not.toHaveBeenCalled();
  });

  it('shows already dialog when getWidgetInfo returns ids', async () => {
    mockWidgetNative().getWidgetInfo.mockResolvedValue([{ widgetId: 1 }]);
    const view = await renderUi(<WidgetAddTrigger catalogId="nextPrayer" testID="add" />);

    await fireEvent.press(view.getByTestId('add'));
    await fireEvent.press(view.getByTestId('add-dialog-confirm'));

    await waitFor(() => expect(view.getByTestId('add-dialog-title')).toBeTruthy());
    expect(mockWidgetNative().requestPinWidget).not.toHaveBeenCalled();
  });

  it('is hidden on iOS pin unsupported path is N/A — shows continue label', async () => {
    Platform.OS = 'ios';
    const view = await renderUi(<WidgetAddTrigger catalogId="nextPrayer" testID="add-ios" />);
    expect(view.getByTestId('add-ios')).toBeTruthy();
  });

  it('shows lock-screen hint after confirm on iOS with lock destination', async () => {
    Platform.OS = 'ios';
    saveWidgetAddDestination('lock');
    const view = await renderUi(<WidgetAddTrigger catalogId="nextPrayer" testID="add-ios-lock" />);

    await fireEvent.press(view.getByTestId('add-ios-lock'));
    await fireEvent.press(view.getByTestId('add-ios-lock-dialog-confirm'));

    await waitFor(() => expect(view.getByText('LockScreenPrayer')).toBeTruthy());
    expect(view.getByTestId('add-ios-lock-add-steps-card')).toBeTruthy();
  });
});
