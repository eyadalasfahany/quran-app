import { fireEvent } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';

import { MoonNoLocation } from './MoonNoLocation';

describe('MoonNoLocation', () => {
  it('asks for the location in Arabic and calls onOpenSalah from the action button', async () => {
    const onOpenSalah = jest.fn();
    const view = await renderUi(<MoonNoLocation onOpenSalah={onOpenSalah} />);
    expect(view.getByText('حدّد موقعك')).toBeOnTheScreen();
    expect(view.getByText('فتح الموقع في الصلاة')).toBeOnTheScreen();
    fireEvent.press(view.getByTestId('moon-no-location-empty-action'));
    expect(onOpenSalah).toHaveBeenCalledTimes(1);
  });

  it('asks for the location in English', async () => {
    const view = await renderUi(<MoonNoLocation onOpenSalah={jest.fn()} />, { locale: 'en' });
    expect(view.getByText('Set your location')).toBeOnTheScreen();
    expect(view.getByText('Open location in Prayer')).toBeOnTheScreen();
  });
});
