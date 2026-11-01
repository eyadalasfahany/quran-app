import { fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { SettingsScreen } from './SettingsScreen';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
  };
});

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), navigate: jest.fn(), push: jest.fn() },
}));

jest.mock('@/features/khatma/data', () => ({
  ...jest.requireActual<typeof import('@/features/khatma/data')>('@/features/khatma/data'),
  useActivePlan: () => ({ data: [] }),
}));

jest.mock('@/features/audio/settings', () => ({
  useAudioSettings: jest.fn((selector: (s: { wifiOnlyDownloads: boolean }) => unknown) =>
    selector({ wifiOnlyDownloads: false }),
  ),
  setWifiOnlyDownloads: jest.fn(),
}));

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the settings title and all section headers in Arabic', async () => {
    const view = await renderUi(<SettingsScreen />);

    expect(view.getByRole('header', { name: 'الإعدادات' })).toBeOnTheScreen();
    expect(view.getByRole('header', { name: 'اللغة' })).toBeOnTheScreen();
    expect(view.getByRole('header', { name: 'القراءة' })).toBeOnTheScreen();
    expect(view.getByRole('header', { name: 'الاستماع' })).toBeOnTheScreen();
    expect(view.getByRole('header', { name: 'الورد والتذكير' })).toBeOnTheScreen();
    expect(view.getByRole('header', { name: 'إشعارات الصلاة' })).toBeOnTheScreen();
    expect(view.getByRole('header', { name: 'عن التطبيق' })).toBeOnTheScreen();
    expect(view.queryByText('تسجيل الدخول')).toBeNull();
  });

  it('calls router.back from the header back button', async () => {
    const view = await renderUi(<SettingsScreen />);

    fireEvent.press(view.getByTestId('settings-back'));

    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('opens reader settings from the appearance row', async () => {
    const view = await renderUi(<SettingsScreen />);

    fireEvent.press(view.getByTestId('reading-appearance-row'));

    expect(router.push).toHaveBeenCalledWith('/reader-settings');
  });

  it('opens sources from the about section', async () => {
    const view = await renderUi(<SettingsScreen />);

    fireEvent.press(view.getByTestId('about-sources-row'));

    expect(router.push).toHaveBeenCalledWith('/settings/sources');
  });

  it('navigates to listen from the default reciter row', async () => {
    const view = await renderUi(<SettingsScreen />);

    fireEvent.press(view.getByTestId('listening-reciter-row'));

    expect(router.navigate).toHaveBeenCalledWith('/(main)/(listen)');
  });

  it('renders the daily reminder row', async () => {
    const view = await renderUi(<SettingsScreen />);

    expect(view.getByTestId('daily-reminder-toggle-row')).toBeOnTheScreen();
  });

  it.each(locales)('renders the screen title in %s', async (locale) => {
    const view = await renderUi(<SettingsScreen />, { locale });

    const expectedTitle = locale === 'en' ? 'Settings' : 'الإعدادات';
    expect(view.getByRole('header', { name: expectedTitle })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/settings/screens/SettingsScreen.tsx')).toEqual([]);
  });
});
