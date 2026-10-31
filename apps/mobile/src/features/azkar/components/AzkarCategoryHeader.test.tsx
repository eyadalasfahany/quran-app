import { screen } from '@testing-library/react-native';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { AzkarCategoryHeader } from './AzkarCategoryHeader';

describe('AzkarCategoryHeader', () => {
  it('shows the title, the sourced line and the progress count', async () => {
    await renderUi(
      <AzkarCategoryHeader fraction={0.5} onBack={jest.fn()} progressText="١٢ من ٢٤" sourceLine="حصن المسلم · ٢٤ ذكرًا" title="أذكار الصباح" />,
    );

    expect(screen.getByRole('header', { name: 'أذكار الصباح' })).toBeOnTheScreen();
    expect(screen.getByText('حصن المسلم · ٢٤ ذكرًا')).toBeOnTheScreen();
    expect(screen.getByText('١٢ من ٢٤')).toBeOnTheScreen();
    expect(screen.getByTestId('azkar-category-header-bar')).toBeTruthy();
  });

  it('goes back from its back button', async () => {
    const onBack = jest.fn();
    await renderUi(
      <AzkarCategoryHeader fraction={0} onBack={onBack} progressText="0 of 24" sourceLine="Hisn al-Muslim · 24 dhikr" title="Morning" />,
      { locale: 'en' },
    );

    await press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarCategoryHeader.tsx')).toEqual([]);
  });
});
