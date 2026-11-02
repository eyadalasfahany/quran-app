import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';

import { SalahDateHeader } from './SalahDateHeader';

// Icons are hidden from screen readers, so queries have to opt in to see the glyph.
const hidden = { includeHiddenElements: true };

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

  it('shows no back button on the tab, where onBack is omitted', async () => {
    const view = await renderUi(<SalahDateHeader onLocationPress={() => undefined} subtitle="s" title="الصلاة" />);

    expect(view.queryByRole('button', { name: 'رجوع' })).toBeNull();
    expect(view.queryByTestId('salah-header-back')).toBeNull();
  });

  it('calls onBack once from the back button when the screen is pushed', async () => {
    const onBack = jest.fn();
    const view = await renderUi(
      <SalahDateHeader onBack={onBack} onLocationPress={() => undefined} subtitle="s" title="الصلاة" />,
    );

    fireEvent.press(view.getByRole('button', { name: 'رجوع' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('puts the back button first in a row, so the layout direction places it on the leading edge', async () => {
    const view = await renderUi(
      <SalahDateHeader onBack={() => undefined} onLocationPress={() => undefined} subtitle="s" title="الصلاة" />,
    );
    const row = view.getByTestId('salah-header');

    expect(flatStyle(row.props.style).flexDirection).toBe('row');
    expect(row.children[0]).toMatchObject({ props: { testID: 'salah-header-back' } });
    expect(flatStyle(view.getByTestId('salah-header-back').props.style)).not.toHaveProperty('position', 'absolute');
  });

  it.each(locales)('points the back chevron at the leading edge under %s', async (locale) => {
    const view = await renderUi(
      <SalahDateHeader onBack={() => undefined} onLocationPress={() => undefined} subtitle="s" title="الصلاة" />,
      { locale },
    );

    // RTL: the chevron points right (mirrored); LTR: it points left (as drawn).
    expect(flatStyle(view.getByTestId('salah-header-back-icon', hidden).props.style).transform).toEqual(
      locale === 'ar' ? [{ scaleX: -1 }] : undefined,
    );
  });
});
