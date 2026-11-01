import { Text } from 'react-native';

import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { AzkarListCard } from './AzkarListCard';
import { screen } from '@testing-library/react-native';

describe('AzkarListCard', () => {
  it('holds its rows', async () => {
    await renderUi(
      <AzkarListCard>
        <Text>first row</Text>
        <Text>second row</Text>
      </AzkarListCard>,
    );

    expect(screen.getByText('first row')).toBeOnTheScreen();
    expect(screen.getByText('second row')).toBeOnTheScreen();
    expect(screen.getByTestId('azkar-list-card')).toBeOnTheScreen();
  });

  it('renders in English too', async () => {
    await renderUi(<AzkarListCard testID="list">{<Text>row</Text>}</AzkarListCard>, { locale: 'en' });
    expect(screen.getByTestId('list')).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarListCard.tsx')).toEqual([]);
  });
});
