import { screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { AzkarScreenHeader } from './AzkarScreenHeader';

describe('AzkarScreenHeader', () => {
  it('renders the title as a header with a labelled back button', async () => {
    await renderUi(<AzkarScreenHeader onBack={jest.fn()} title="المفضلة" />);

    expect(screen.getByRole('header', { name: 'المفضلة' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'رجوع' })).toBeOnTheScreen();
  });

  it('renders the subtitle and the trailing controls', async () => {
    await renderUi(
      <AzkarScreenHeader onBack={jest.fn()} subtitle="حصن المسلم · ٢٤ ذكرًا" title="أذكار الصباح" trailing={<Text>trailing</Text>} />,
    );

    expect(screen.getByText('حصن المسلم · ٢٤ ذكرًا')).toBeOnTheScreen();
    expect(screen.getByText('trailing')).toBeOnTheScreen();
  });

  it('calls onBack when the back button is pressed', async () => {
    const onBack = jest.fn();
    await renderUi(<AzkarScreenHeader onBack={onBack} title="Favourites" />, { locale: 'en' });

    await press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarScreenHeader.tsx')).toEqual([]);
  });
});
