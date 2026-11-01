import { screen } from '@testing-library/react-native';

import { makeDetail, press } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { AzkarDetailsPanel } from './AzkarDetailsPanel';

const mockEntry = jest.fn();

jest.mock('../data/hooks', () => ({
  useEntry: (entryKey: string) => mockEntry(entryKey),
}));

describe('AzkarDetailsPanel', () => {
  beforeEach(() => mockEntry.mockReset());

  it('shows the details of the entry beside the reader', async () => {
    mockEntry.mockReturnValue(makeDetail());
    await renderUi(<AzkarDetailsPanel entryKey="fixture:entry-001" onClose={jest.fn()} />);
    expect(screen.getByText('المصدر والتفاصيل')).toBeTruthy();
    expect(screen.getByText('المناسبة')).toBeTruthy();
    expect(mockEntry).toHaveBeenCalledWith('fixture:entry-001');
  });

  it('renders nothing while the entry is unavailable', async () => {
    mockEntry.mockReturnValue(undefined);
    await renderUi(<AzkarDetailsPanel entryKey="missing" onClose={jest.fn()} />);
    expect(screen.queryByTestId('azkar-details-panel')).toBeNull();
  });

  it('closes from its close button', async () => {
    mockEntry.mockReturnValue(makeDetail());
    const onClose = jest.fn();
    await renderUi(<AzkarDetailsPanel entryKey="fixture:entry-001" onClose={onClose} />);
    await press(screen.getByRole('button', { name: 'إغلاق' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarDetailsPanel.tsx')).toEqual([]);
  });
});
