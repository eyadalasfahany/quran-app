import { fireEvent } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';

import { MOON_NO_LOCATION_ICON, MoonNoLocation } from './MoonNoLocation';

describe('MoonNoLocation', () => {
  it('maps the empty-state glyph to location.slash on iOS and location_off on Android', () => {
    expect(MOON_NO_LOCATION_ICON).toEqual({ ios: 'location.slash', android: 'location_off' });
  });

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
