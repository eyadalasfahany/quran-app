import { screen } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { AzkarStorageSummary } from './AzkarStorageSummary';

describe('AzkarStorageSummary', () => {
  it('shows the label and the storage in whole Arabic-Indic megabytes', async () => {
    await renderUi(<AzkarStorageSummary bytes={12 * 1024 * 1024} />);
    expect(screen.getByText('المساحة المستخدمة')).toBeOnTheScreen();
    expect(screen.getByText('١٢ م.ب')).toBeOnTheScreen();
  });

  it('shows one decimal place in Arabic', async () => {
    await renderUi(<AzkarStorageSummary bytes={4_404_019} />);
    expect(screen.getByText('٤٫٢ م.ب')).toBeOnTheScreen();
  });

  it('shows zero when nothing is stored', async () => {
    await renderUi(<AzkarStorageSummary bytes={0} />);
    expect(screen.getByText('٠ م.ب')).toBeOnTheScreen();
  });

  it('shows the storage in English', async () => {
    await renderUi(<AzkarStorageSummary bytes={4_404_019} />, { locale: 'en' });
    expect(screen.getByText('Storage used')).toBeOnTheScreen();
    expect(screen.getByText('4.2 MB')).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarStorageSummary.tsx')).toEqual([]);
  });
});
