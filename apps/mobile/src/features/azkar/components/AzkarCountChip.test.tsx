import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { AzkarCountChip } from './AzkarCountChip';

describe('AzkarCountChip', () => {
  it('shows the count with Arabic-Indic digits and labels it for screen readers', async () => {
    await renderUi(<AzkarCountChip count={3} />);

    expect(screen.getByText('×٣')).toBeOnTheScreen();
    expect(screen.getByLabelText('٣ مرات')).toBeOnTheScreen();
  });

  it('shows the count with Western digits in English', async () => {
    await renderUi(<AzkarCountChip count={33} />, { locale: 'en' });

    expect(screen.getByText('×33')).toBeOnTheScreen();
    expect(screen.getByLabelText('33 times')).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarCountChip.tsx')).toEqual([]);
  });
});
