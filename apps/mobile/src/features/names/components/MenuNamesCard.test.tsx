import { fireEvent } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { MenuNamesCard } from './MenuNamesCard';

describe('MenuNamesCard', () => {
  it('shows the Names title in Arabic', async () => {
    const view = await renderUi(<MenuNamesCard onPress={jest.fn()} />);
    expect(view.getByText('أسماء الله الحسنى')).toBeOnTheScreen();
  });

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<MenuNamesCard onPress={onPress} testID="card" />);
    fireEvent.press(view.getByTestId('card'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('uses i18n only for visible strings', () => {
    expect(featureComponentLiterals('features/names/components/MenuNamesCard.tsx')).toEqual([]);
  });
});
