import { fireEvent } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';

import { FIXTURE_NAME_AR } from '../constants';
import { NameCard } from './NameCard';

describe('NameCard', () => {
  const item = {
    nameSlug: 'fixture-name-1',
    position: 1,
    nameAr: FIXTURE_NAME_AR,
    isFavourite: false,
  };

  it('renders the placeholder name and opens on press', async () => {
    const onPress = jest.fn();
    const view = await renderUi(
      <NameCard item={item} onFavouritePress={jest.fn()} onPress={onPress} testID="card" />,
    );
    expect(view.getByText(FIXTURE_NAME_AR)).toBeOnTheScreen();
    fireEvent.press(view.getByTestId('card'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
