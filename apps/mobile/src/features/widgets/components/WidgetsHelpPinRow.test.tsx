import { Platform } from 'react-native';

import { renderUi } from '../../../../jest/render-ui';

import { WidgetsHelpPinRow } from './WidgetsHelpPinRow';

jest.mock('react-native-android-widget', () => ({
  getWidgetInfo: jest.fn(async () => []),
  requestPinWidget: jest.fn(async () => true),
}));

describe('WidgetsHelpPinRow', () => {
  beforeEach(() => {
    Platform.OS = 'android';
  });

  it('shows the pin control on Android', async () => {
    const view = await renderUi(<WidgetsHelpPinRow catalogId="misbaha" testID="pin-row" title="المسبحة" />);

    expect(view.getByTestId('pin-row-add')).toBeOnTheScreen();
  });
});
