import { fireEvent } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { QiblaNoLocation } from './QiblaNoLocation';

describe('QiblaNoLocation', () => {
  it('renders title, body and the set-location action', async () => {
    const view = await renderUi(<QiblaNoLocation onSetLocation={jest.fn()} />);

    expect(view.getByRole('header', { name: 'الموقع غير محدد' })).toBeOnTheScreen();
    expect(view.getByText('نحتاج موقعك لحساب اتجاه القبلة والمسافة')).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'تحديد الموقع' })).toBeOnTheScreen();
  });

  it('calls onSetLocation from the action', async () => {
    const onSetLocation = jest.fn();
    const view = await renderUi(<QiblaNoLocation onSetLocation={onSetLocation} />);

    await fireEvent.press(view.getByRole('button', { name: 'تحديد الموقع' }));

    expect(onSetLocation).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('centres its text in %s', async (locale) => {
    const view = await renderUi(<QiblaNoLocation onSetLocation={jest.fn()} />, { locale });

    expect(
      view.getByRole('header', {
        name: locale === 'ar' ? 'الموقع غير محدد' : 'Location not set',
      }),
    ).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/salah/components/QiblaNoLocation.tsx')).toEqual([]);
  });
});
