import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { AzkarReaderTopBar } from './AzkarReaderTopBar';

describe('AzkarReaderTopBar', () => {
  it('renders the title, the progress count and the progress bar', async () => {
    await renderUi(<AzkarReaderTopBar fraction={5 / 24} onClose={jest.fn()} progressText="٥ من ٢٤" title="أذكار الصباح" />);
    expect(screen.getByRole('header', { name: 'أذكار الصباح' })).toBeTruthy();
    expect(screen.getByText('٥ من ٢٤')).toBeTruthy();
    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(21);
  });

  it('calls onClose from the close button', async () => {
    const onClose = jest.fn();
    await renderUi(<AzkarReaderTopBar fraction={0} onClose={onClose} progressText="٠ من ٣" title="أذكار الصباح" />);
    await press(screen.getByRole('button', { name: 'إغلاق' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders in English with its own labels', async () => {
    await renderUi(<AzkarReaderTopBar fraction={1} onClose={jest.fn()} progressText="3 of 3" title="Morning" />, { locale: 'en' });
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
    expect(screen.getByText('3 of 3')).toBeTruthy();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarReaderTopBar.tsx')).toEqual([]);
  });
});
