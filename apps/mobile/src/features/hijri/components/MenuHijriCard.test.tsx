import { fireEvent } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';

import { MenuHijriCard } from './MenuHijriCard';

describe('MenuHijriCard', () => {
  it('shows the Hijri calendar title, the caption and today in the preview line', async () => {
    const view = await renderUi(<MenuHijriCard onPress={jest.fn()} preview="٢٢ جمادى الأولى ١٤٤٨" />);

    expect(view.getByText('التقويم الهجري')).toBeOnTheScreen();
    expect(view.getByText('اليوم')).toBeOnTheScreen();
    expect(view.getByText('٢٢ جمادى الأولى ١٤٤٨')).toBeOnTheScreen();
  });

  it('opens the calendar when pressed', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<MenuHijriCard onPress={onPress} preview="date" testID="card" />);

    fireEvent.press(view.getByTestId('card'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders in English', async () => {
    const view = await renderUi(<MenuHijriCard onPress={jest.fn()} preview="22 Jumada I 1448" />, { locale: 'en' });

    expect(view.getByText('Hijri calendar')).toBeOnTheScreen();
    expect(view.getByText('Today')).toBeOnTheScreen();
  });
});
