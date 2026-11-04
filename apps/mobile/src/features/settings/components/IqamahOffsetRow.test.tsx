import { fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { storage, storageKeys } from '@/core/storage/mmkv';
import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { IqamahOffsetRow } from './IqamahOffsetRow';

const INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

function row() {
  return (
    <SafeAreaProvider initialMetrics={{ frame: { height: 844, width: 390, x: 0, y: 0 }, insets: INSETS }}>
      <IqamahOffsetRow />
    </SafeAreaProvider>
  );
}

jest.mock('@/features/salah/data/notifications', () => ({
  ...jest.requireActual('@/features/salah/data/notifications'),
  setIqamahOffset: jest.fn(() => Promise.resolve()),
}));

const { setIqamahOffset } = jest.requireMock<{ setIqamahOffset: jest.Mock }>('@/features/salah/data/notifications');

describe('IqamahOffsetRow', () => {
  beforeEach(() => {
    storage.clearAll();
    setIqamahOffset.mockClear();
  });

  it('shows off by default and opens the sheet', async () => {
    const view = await renderUi(row());

    expect(view.getByText('إيقاف')).toBeOnTheScreen();
    fireEvent.press(view.getByTestId('iqamah-offset-row'));
    await waitFor(() => {
      expect(view.getByTestId('iqamah-offset-row-sheet')).toBeOnTheScreen();
    });
  });

  it('shows the stored offset in the trailing label', async () => {
    storage.set(storageKeys.salah.iqamahOffsetMinutes, 15);

    const view = await renderUi(row());

    expect(view.getByTestId('iqamah-offset-row-value')).toHaveTextContent(/15|١٥/);
  });

  it('selects 15 from the sheet and calls setIqamahOffset', async () => {
    const view = await renderUi(row());

    fireEvent.press(view.getByTestId('iqamah-offset-row'));
    await waitFor(() => {
      expect(view.getByTestId('iqamah-offset-row-sheet-option-15')).toBeOnTheScreen();
    });
    fireEvent.press(view.getByTestId('iqamah-offset-row-sheet-option-15'));

    expect(setIqamahOffset).toHaveBeenCalledWith(15);
  });

  it('exposes the row title for accessibility', async () => {
    const view = await renderUi(row());

    expect(view.getByRole('button', { name: 'تذكير الإقامة' })).toBeOnTheScreen();
  });

  it.each(locales)('renders the label in %s', async (locale) => {
    const view = await renderUi(row(), { locale });
    const expected = locale === 'en' ? 'Iqamah reminder' : 'تذكير الإقامة';
    expect(view.getByText(expected)).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/settings/components/IqamahOffsetRow.tsx')).toEqual([]);
    expect(featureComponentLiterals('features/settings/components/IqamahOffsetSheet.tsx')).toEqual([]);
  });
});
