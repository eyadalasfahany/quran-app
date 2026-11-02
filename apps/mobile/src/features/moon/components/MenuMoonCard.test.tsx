import { fireEvent } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';

import { MenuMoonCard } from './MenuMoonCard';

describe('MenuMoonCard', () => {
  it('opens moon sighting when pressed', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<MenuMoonCard onPress={onPress} preview="الاقتران خلال ٧ ساعات" testID="card" />);
    fireEvent.press(view.getByTestId('card'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows the Crescent eyebrow, the title and the conjunction line in Arabic', async () => {
    const view = await renderUi(<MenuMoonCard onPress={jest.fn()} preview="الاقتران خلال ٧ ساعات" />);
    expect(view.getByText('الهلال')).toBeOnTheScreen();
    expect(view.getByText('رؤية الهلال')).toBeOnTheScreen();
    expect(view.getByText('الاقتران خلال ٧ ساعات')).toBeOnTheScreen();
  });

  it('shows the Crescent eyebrow and the title in English', async () => {
    const view = await renderUi(<MenuMoonCard onPress={jest.fn()} preview="Conjunction 7 hours ago" />, { locale: 'en' });
    expect(view.getByText('Crescent')).toBeOnTheScreen();
    expect(view.getByText('Moon sighting')).toBeOnTheScreen();
    expect(view.getByText('Conjunction 7 hours ago')).toBeOnTheScreen();
  });
});
