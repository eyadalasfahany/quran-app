import { fireEvent } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';

import { MenuMoonCard } from './MenuMoonCard';

describe('MenuMoonCard', () => {
  it('opens moon sighting when pressed', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<MenuMoonCard onPress={onPress} preview="Zone B" testID="card" />);
    fireEvent.press(view.getByTestId('card'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
