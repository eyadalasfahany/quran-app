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

  it('shows the adhan sound button before the location button, and opens the picker from it', async () => {
    const onSoundPress = jest.fn();
    const view = await renderUi(<SalahDateHeader onLocationPress={() => undefined} onSoundPress={onSoundPress} subtitle="s" title="الصلاة" />);

    const sound = view.getByTestId('salah-header-sound');
    expect(sound.props.accessibilityLabel).toBe('صوت الأذان');
    expect(view.getByTestId('salah-header-location')).toBeOnTheScreen();

    await fireEvent.press(sound);

    expect(onSoundPress).toHaveBeenCalledTimes(1);
  });

  it('shows the location button alone when there is no sound handler', async () => {
    const view = await renderUi(<SalahDateHeader onLocationPress={() => undefined} subtitle="s" title="الصلاة" />);

    expect(view.queryByTestId('salah-header-sound')).toBeNull();
    expect(view.getByTestId('salah-header-location')).toBeOnTheScreen();
  });

  it.each(locales)('labels the sound button in %s', async (locale) => {
    const view = await renderUi(<SalahDateHeader onLocationPress={() => undefined} onSoundPress={() => undefined} subtitle="s" title="الصلاة" />, { locale });

    expect(view.getByRole('button', { name: locale === 'en' ? 'Adhan sound' : 'صوت الأذان' })).toBeOnTheScreen();
  });
});
