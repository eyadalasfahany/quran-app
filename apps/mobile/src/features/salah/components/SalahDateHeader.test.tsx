import { fireEvent } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';

import { SalahDateHeader } from './SalahDateHeader';

describe('SalahDateHeader', () => {
  it.each(locales)('renders the title and date subtitle (%s)', async (locale) => {
    const view = await renderUi(<SalahDateHeader onLocationPress={() => undefined} subtitle="٢٠ جمادى الأولى ١٤٤٨ · السبت ٣١ أكتوبر" title="الصلاة" />, { locale });

    expect(view.getByText('الصلاة')).toBeTruthy();
    expect(view.getByTestId('salah-header-subtitle')).toHaveTextContent('٢٠ جمادى الأولى ١٤٤٨ · السبت ٣١ أكتوبر');
  });

  it('exposes the title as a header', async () => {
    const view = await renderUi(<SalahDateHeader onLocationPress={() => undefined} subtitle="s" title="الصلاة" />);

    expect(view.getByRole('header')).toHaveTextContent('الصلاة');
  });

  it('opens the location sheet from the raised button, labelled «الموقع»', async () => {
    const onLocationPress = jest.fn();
    const view = await renderUi(<SalahDateHeader onLocationPress={onLocationPress} subtitle="s" title="الصلاة" />);

    await fireEvent.press(view.getByTestId('salah-header-location'));

    expect(onLocationPress).toHaveBeenCalledTimes(1);
    expect(view.getByTestId('salah-header-location').props.accessibilityLabel).toBe('الموقع');
  });
});
