import { fireEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { renderUi } from '../../../../jest/render-ui';

import { WidgetPinButton } from './WidgetPinButton';

jest.mock('react-native-android-widget', () => ({
  requestPinWidget: jest.fn(async () => true),
}));

function mockRequestPinWidget() {
  return jest.requireMock('react-native-android-widget').requestPinWidget as jest.Mock;
}

describe('WidgetPinButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
    mockRequestPinWidget().mockResolvedValue(true);
  });

  it('calls requestPinWidget on Android', async () => {
    const view = await renderUi(<WidgetPinButton testID="pin" widgetName="NextPrayer" />);

    await fireEvent.press(view.getByTestId('pin'));

    expect(mockRequestPinWidget()).toHaveBeenCalledWith({ widgetName: 'NextPrayer' });
  });

  it('is hidden on iOS', async () => {
    Platform.OS = 'ios';
    const view = await renderUi(<WidgetPinButton testID="pin" widgetName="NextPrayer" />);

    expect(view.queryByTestId('pin')).toBeNull();
  });

  it('hides when pinning is unsupported', async () => {
    mockRequestPinWidget().mockResolvedValueOnce(false);
    const view = await renderUi(<WidgetPinButton testID="pin" widgetName="Misbaha" />);

    await fireEvent.press(view.getByTestId('pin'));

    expect(view.queryByTestId('pin')).toBeNull();
  });

  it('hides when the native module is not linked', async () => {
    mockRequestPinWidget().mockRejectedValueOnce(
      new Error("The package 'react-native-android-widget' doesn't seem to be linked."),
    );
    const view = await renderUi(<WidgetPinButton testID="pin" widgetName="NextPrayer" />);

    await fireEvent.press(view.getByTestId('pin'));

    expect(view.queryByTestId('pin')).toBeNull();
  });
});
