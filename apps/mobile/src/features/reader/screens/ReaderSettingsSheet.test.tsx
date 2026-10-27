import { router } from 'expo-router';
import { fireEvent } from '@testing-library/react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';

import { renderUi } from '../../../../jest/render-ui';
import { resetReaderSettingsStore, useReaderSettings } from '../settings';
import { ReaderSettingsSheet } from './ReaderSettingsSheet';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

const translations = [{ authorName: null, id: 12, name: 'English' }];

describe('ReaderSettingsSheet', () => {
  beforeEach(() => {
    storage.remove(storageKeys.readerSettings);
    storage.remove(storageKeys.appearance);
    resetReaderSettingsStore();
    jest.mocked(router.back).mockClear();
  });

  it('applies mode, font scale and translations as they change', async () => {
    const view = await renderUi(<ReaderSettingsSheet previewText="ٱلْحَمْدُ" translations={translations} />);
    expect(view.getByRole('header', { name: 'إعدادات القراءة' })).toBeOnTheScreen();

    await fireEvent.press(view.getByTestId('reader-mode-picker-focus'));
    expect(useReaderSettings.getState().mode).toBe('focus');

    await fireEvent.press(view.getByTestId('reader-font-increase'));
    expect(useReaderSettings.getState().fontScale).toBe(1.1);
    expect(view.getByTestId('reader-font-preview')).toHaveTextContent('ٱلْحَمْدُ');

    await fireEvent.press(view.getByTestId('reader-translation-12'));
    expect(useReaderSettings.getState().translationIds).toEqual([12]);
    expect(useReaderSettings.getState().translationsChosen).toBe(true);
  });

  it('closes with the sheet close button', async () => {
    const view = await renderUi(<ReaderSettingsSheet previewText="ٱلْحَمْدُ" translations={translations} />);

    await fireEvent.press(view.getByTestId('reader-settings-close'));

    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
