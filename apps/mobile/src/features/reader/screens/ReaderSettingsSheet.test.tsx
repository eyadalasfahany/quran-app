import { router } from 'expo-router';
import { fireEvent } from '@testing-library/react-native';

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
    expect(view.getByText('المصحف')).toBeOnTheScreen();

    const labels = view
      .getAllByText(/^(طريقة العرض|المظهر|حجم خط المصحف|المصحف)$/)
      .map((node) => node.props.children as string);
    expect(labels).toEqual(['طريقة العرض', 'المظهر', 'حجم خط المصحف', 'المصحف']);
  });

  it('applies the chosen mushaf at once, without changing the mode', async () => {
    useReaderSettings.getState().setMode('mushaf');
    const view = await renderUi(<ReaderSettingsSheet />);
    expect(view.getByTestId('mushaf-hafs').props.accessibilityState?.checked).toBe(true);

    await fireEvent.press(view.getByTestId('mushaf-warsh'));

    expect(useReaderSettings.getState().mushaf).toBe('warsh');
    expect(useReaderSettings.getState().mode).toBe('mushaf');
    expect(view.getByTestId('mushaf-warsh').props.accessibilityState?.checked).toBe(true);
  });

  // al-Duri is hidden from the pickers until its numbering is settled (ADR 0090 amendment, item 12).
  it.each(locales)('names the four pickable riwayat in %s', async (locale) => {
    const view = await renderUi(<ReaderSettingsSheet />, { locale });
    expect(view.getByText(locale === 'ar' ? 'حفص عن عاصم' : 'Hafs from Asim')).toBeOnTheScreen();
    expect(view.queryByText(locale === 'ar' ? 'الدوري عن أبي عمرو' : 'Al-Duri from Abu Amr')).toBeNull();
    expect(view.getAllByRole('radio')).toHaveLength(4);
  });

  it('shows the page zoom in Mushaf mode, with its hint where the riwayah has no word data', async () => {
    useReaderSettings.getState().setMode('mushaf');
    const view = await renderUi(<ReaderSettingsSheet />, { locale: 'en' });
    expect(view.getByTestId('reader-mushaf-zoom-percent')).toHaveTextContent('100%');
    expect(view.queryByTestId('reader-font-percent')).toBeNull();
    expect(
      view.getByText('Zoom is available for riwayat that have word-by-word data. This riwayah will get it later.'),
    ).toBeOnTheScreen();
    // Under the row, not inside it: beside the stepper it overflowed the sheet on the iPhone.
    const row = view.getByTestId('reader-mushaf-zoom').parent;
    expect(view.getByTestId('reader-mushaf-zoom-unavailable')).toBeOnTheScreen();
    expect(row).not.toContainElement(view.getByTestId('reader-mushaf-zoom-unavailable'));
  });

  it('shows the text size in Reading, not the page zoom', async () => {
    useReaderSettings.getState().setMode('reading');
    const view = await renderUi(<ReaderSettingsSheet />, { locale: 'en' });
    expect(view.getByTestId('reader-font-percent')).toBeOnTheScreen();
    expect(view.queryByTestId('reader-mushaf-zoom-percent')).toBeNull();
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

  it('draws the muted 36 pt grabber and the close button as interactive glass (developer, 26 Nov 2026)', async () => {
    const view = await renderUi(<ReaderSettingsSheet />);

    expect(flatStyle(view.getByTestId('reader-settings-sheet-grabber').props.style)).toMatchObject({
      opacity: 0.4,
      width: 36,
    });
    // The frame's track-filled ✕ is Liquid Glass where the platform has it; IconButton tests the solid fallback.
    expect(view.getByTestId('reader-settings-close-glass', { includeHiddenElements: true }).props.isInteractive).toBe(true);
  });

  it('uses theme tokens only', () => {
    expect(featureComponentLiterals('features/reader/screens/ReaderSettingsSheet.tsx')).toEqual([]);
  });
});
