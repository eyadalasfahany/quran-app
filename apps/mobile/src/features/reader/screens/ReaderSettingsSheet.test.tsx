import { router } from 'expo-router';
import { fireEvent } from '@testing-library/react-native';

import { themes } from '@/core/theme';
import { storage, storageKeys } from '@/core/storage/mmkv';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { resetReaderSettingsStore, useReaderSettings } from '../settings';
import { ReaderSettingsSheet } from './ReaderSettingsSheet';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

describe('ReaderSettingsSheet', () => {
  beforeEach(() => {
    storage.remove(storageKeys.readerSettings);
    storage.remove(storageKeys.appearance);
    resetReaderSettingsStore();
    jest.mocked(router.back).mockClear();
  });

  it('applies mode and font scale as they change', async () => {
    const view = await renderUi(<ReaderSettingsSheet />);
    expect(view.getByRole('header', { name: 'إعدادات القراءة' })).toBeOnTheScreen();

    await fireEvent.press(view.getByTestId('reader-mode-picker-focus'));
    expect(useReaderSettings.getState().mode).toBe('focus');

    await fireEvent.press(view.getByTestId('reader-font-increase'));
    expect(useReaderSettings.getState().fontScale).toBe(1.1);
  });

  it('labels each block in frame order with the section label above its control', async () => {
    const view = await renderUi(<ReaderSettingsSheet />);

    expect(view.getByText('طريقة العرض')).toBeOnTheScreen();
    expect(view.getByText('المظهر')).toBeOnTheScreen();
    expect(view.getByText('حجم خط المصحف')).toBeOnTheScreen();
    expect(view.queryByText('خط المصحف')).toBeNull();
  });

  it('shows no Quran preview behind the controls', async () => {
    const view = await renderUi(<ReaderSettingsSheet />);

    expect(view.queryByTestId('reader-font-preview')).toBeNull();
  });

  it('spaces the sections like the frame: 18 pt sides, 14 pt gaps, 20 pt bottom', async () => {
    const view = await renderUi(<ReaderSettingsSheet />);
    const scroll = view.getByTestId('reader-settings-scroll');

    expect(flatStyle(scroll.props.contentContainerStyle)).toMatchObject({
      gap: 14,
      paddingBottom: 20,
      paddingHorizontal: 18,
      paddingTop: 14,
    });
  });

  it.each(locales)('titles the sheet and labels its close button in %s', async (locale) => {
    const view = await renderUi(<ReaderSettingsSheet />, { locale });

    expect(view.getByTestId('reader-settings-title')).toHaveTextContent(locale === 'ar' ? 'إعدادات القراءة' : 'Reading settings');
    expect(view.getByTestId('reader-settings-close').props.accessibilityRole).toBe('button');
  });

  it('closes with the sheet close button', async () => {
    const view = await renderUi(<ReaderSettingsSheet />);

    await fireEvent.press(view.getByTestId('reader-settings-close'));

    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('draws the muted 36 pt grabber and the track-filled close button of the settings frame', async () => {
    const view = await renderUi(<ReaderSettingsSheet />);

    expect(flatStyle(view.getByTestId('reader-settings-sheet-grabber').props.style)).toMatchObject({
      opacity: 0.4,
      width: 36,
    });
    expect(flatStyle(view.getByTestId('reader-settings-close').props.style).backgroundColor).toBe(
      themes.light.colors.fillTrack,
    );
  });

  it('uses theme tokens only', () => {
    expect(featureComponentLiterals('features/reader/screens/ReaderSettingsSheet.tsx')).toEqual([]);
  });
});
