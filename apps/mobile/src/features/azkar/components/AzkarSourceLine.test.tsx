import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { AzkarSourceLine } from './AzkarSourceLine';

describe('AzkarSourceLine', () => {
  it('shows the source with the reference in Arabic-Indic digits', async () => {
    await renderUi(<AzkarSourceLine onPressDetails={jest.fn()} reference="75" />);
    expect(screen.getByText('حصن المسلم · ٧٥')).toBeTruthy();
  });

  it('keeps a non-numeric reference as written', async () => {
    await renderUi(<AzkarSourceLine onPressDetails={jest.fn()} reference="FIXTURE-001" />);
    expect(screen.getByText('حصن المسلم · FIXTURE-001')).toBeTruthy();
  });

  it('opens the details from its button', async () => {
    const onPressDetails = jest.fn();
    await renderUi(<AzkarSourceLine onPressDetails={onPressDetails} reference="75" />);
    await press(screen.getByRole('button', { name: 'المصدر والتفاصيل' }));
    expect(onPressDetails).toHaveBeenCalledTimes(1);
  });

  it('renders the English source line with Western digits', async () => {
    await renderUi(<AzkarSourceLine onPressDetails={jest.fn()} reference="75" />, { locale: 'en' });
    expect(screen.getByText('Hisn al-Muslim · 75')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Source and details' })).toBeTruthy();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarSourceLine.tsx')).toEqual([]);
  });
});
