import { act, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { locales, renderUi } from '../../../../jest/render-ui';
import { setPrayerSound } from '../data/notifications';
import { useAdhanPreview, type AdhanPreviewControls } from '../data/adhan-preview';
import { setPrayerSoundValue } from '../data/adhan-sounds';
import { storage } from '@/core/storage/mmkv';

import { AdhanSoundScreen } from './AdhanSoundScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false), replace: jest.fn() },
}));

jest.mock('../data/notifications', () => ({
  setPrayerSound: jest.fn(() => new Promise<void>(() => undefined)),
}));

jest.mock('../data/adhan-preview', () => ({
  useAdhanPreview: jest.fn(),
}));

const preview = (overrides: Partial<AdhanPreviewControls> = {}): AdhanPreviewControls => ({
  playingId: null,
  progress: 0,
  toggle: jest.fn(),
  stop: jest.fn(),
  ...overrides,
});

const INSETS = { top: 59, right: 0, bottom: 34, left: 0 };

function screen() {
  return (
    <SafeAreaProvider initialMetrics={{ frame: { height: 844, width: 390, x: 0, y: 0 }, insets: INSETS }}>
      <AdhanSoundScreen />
    </SafeAreaProvider>
  );
}

describe('AdhanSoundScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAdhanPreview).mockReturnValue(preview());
    storage.clearAll();
  });

  it('shows the header title and the five sounds, with the stored one checked', async () => {
    setPrayerSoundValue('makkah');

    const view = await renderUi(screen());

    expect(view.getByRole('header', { name: 'صوت الأذان' })).toBeOnTheScreen();
    expect(view.getByRole('radio', { name: 'المسجد الحرام' }).props.accessibilityState).toEqual({ checked: true });
    expect(view.getByRole('radio', { name: 'الله أكبر' }).props.accessibilityState).toEqual({ checked: false });
  });

  it('checks the default voice when nothing is stored', async () => {
    const view = await renderUi(screen());

    expect(view.getByRole('radio', { name: 'الله أكبر' }).props.accessibilityState).toEqual({ checked: true });
  });

  it('moves the check at once on a tap and saves the sound without waiting for the schedule', async () => {
    const view = await renderUi(screen());

    await act(async () => {
      fireEvent.press(view.getByRole('radio', { name: 'المسجد النبوي' }));
    });

    // setPrayerSound never resolves in this test: the check must not wait for it.
    expect(view.getByRole('radio', { name: 'المسجد النبوي' }).props.accessibilityState).toEqual({ checked: true });
    expect(view.getByRole('radio', { name: 'الله أكبر' }).props.accessibilityState).toEqual({ checked: false });
    expect(setPrayerSound).toHaveBeenCalledWith('madinah');
  });

  it('toggles the preview of a voice from its play button', async () => {
    const controls = preview();
    jest.mocked(useAdhanPreview).mockReturnValue(controls);
    const view = await renderUi(screen());

    fireEvent.press(view.getByRole('button', { name: 'تشغيل المسجد الحرام' }));

    expect(controls.toggle).toHaveBeenCalledWith('makkah');
    expect(setPrayerSound).not.toHaveBeenCalled();
  });

  it('shows the playing voice with its stop label and progress, while the selection can change', async () => {
    jest.mocked(useAdhanPreview).mockReturnValue(preview({ playingId: 'makkah', progress: 0.4 }));
    const view = await renderUi(screen());

    await act(async () => {
      fireEvent.press(view.getByRole('radio', { name: 'صامت' }));
    });

    expect(view.getByRole('button', { name: 'إيقاف المسجد الحرام' })).toBeOnTheScreen();
    expect(view.getByRole('radio', { name: 'صامت' }).props.accessibilityState).toEqual({ checked: true });
  });

  it('goes back when the back button is pressed', async () => {
    const view = await renderUi(screen());

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: 'رجوع' }));
    });

    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('renders the header and the list in %s', async (locale) => {
    const view = await renderUi(screen(), { locale });

    expect(view.getByRole('header', { name: locale === 'en' ? 'Adhan sound' : 'صوت الأذان' })).toBeOnTheScreen();
    expect(view.getAllByRole('radio')).toHaveLength(5);
  });
});
