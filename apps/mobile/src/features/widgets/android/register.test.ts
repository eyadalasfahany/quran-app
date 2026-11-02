import { Platform } from 'react-native';
import { registerWidgetTaskHandler, requestWidgetUpdate } from 'react-native-android-widget';

import { requestAndroidWidgetUpdates } from './update';
import { WIDGET_PROVIDER_NAMES, WIDGET_PROVIDERS } from './names';
import { registerWidgetTasks } from './register';

jest.mock('react-native-android-widget', () => ({
  registerWidgetTaskHandler: jest.fn(),
  requestWidgetUpdate: jest.fn(async () => undefined),
}));

function setPlatform(os: 'android' | 'ios'): void {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
}

describe('widget registration', () => {
  const originalOs = Platform.OS;

  beforeEach(() => {
    jest.mocked(registerWidgetTaskHandler).mockClear();
  });

  afterEach(() => {
    setPlatform(originalOs as 'android' | 'ios');
  });

  it('registers exactly one headless task handler on Android', () => {
    setPlatform('android');
    registerWidgetTasks();
    expect(registerWidgetTaskHandler).toHaveBeenCalledTimes(1);
  });

  it('registers nothing on iOS, which has no Android widget task', () => {
    setPlatform('ios');
    registerWidgetTasks();
    expect(registerWidgetTaskHandler).not.toHaveBeenCalled();
  });

  it('asks every provider to update', async () => {
    jest.mocked(requestWidgetUpdate).mockClear();
    await requestAndroidWidgetUpdates();
    expect(requestWidgetUpdate).toHaveBeenCalledTimes(WIDGET_PROVIDER_NAMES.length);
  });

  it('skips the provider that has already been drawn', async () => {
    jest.mocked(requestWidgetUpdate).mockClear();
    await requestAndroidWidgetUpdates({ except: WIDGET_PROVIDERS.misbaha });
    const names = jest.mocked(requestWidgetUpdate).mock.calls.map((call) => call[0].widgetName);
    expect(names).not.toContain(WIDGET_PROVIDERS.misbaha);
  });
});
