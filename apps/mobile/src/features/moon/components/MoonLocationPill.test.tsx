import { fireEvent } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';

import { MoonLocationPill } from './MoonLocationPill';

describe('MoonLocationPill', () => {
  it('shows the location in Arabic and is a button labelled with it', async () => {
    const view = await renderUi(<MoonLocationPill label="مكة المكرمة" onPress={jest.fn()} testID="pill" />);
    expect(view.getByText('مكة المكرمة')).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'الموقع: مكة المكرمة' })).toBeOnTheScreen();
  });

  it('is a button labelled in English', async () => {
    const view = await renderUi(<MoonLocationPill label="Makkah" onPress={jest.fn()} />, { locale: 'en' });
    expect(view.getByRole('button', { name: 'Location: Makkah' })).toBeOnTheScreen();
  });

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<MoonLocationPill label="Makkah" onPress={onPress} testID="pill" />, { locale: 'en' });
    fireEvent.press(view.getByTestId('pill'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
