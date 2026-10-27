import { act } from '@testing-library/react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';

import { renderUi } from '../../../../jest/render-ui';
import { resetReaderSelection } from '../selection';
import { resetReaderSettingsStore, useReaderSettings } from '../settings';
import { ReaderScreen } from './ReaderScreen';

describe('ReaderScreen', () => {
  beforeEach(() => {
    storage.remove(storageKeys.readerSettings);
    storage.remove(storageKeys.readerLastVerseKey);
    storage.remove(storageKeys.readerLastPage);
    storage.remove(storageKeys.readerMode);
    resetReaderSettingsStore();
    resetReaderSelection();
  });

  it('keeps the anchor ayah when the reading mode changes', async () => {
    const view = await renderUi(<ReaderScreen verseKey="2:255" />);
    expect(view.getByTestId('reader-screen').props.accessibilityLabel).toBe('2:255');

    await act(async () => {
      useReaderSettings.getState().setMode('focus');
    });

    expect(storage.getString(storageKeys.readerLastVerseKey)).toBe('2:255');
    expect(storage.getString(storageKeys.readerMode)).toBe('focus');
    expect(view.getByTestId('reader-screen').props.accessibilityLabel).toBe('2:255');
  });
});
