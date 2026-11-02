import * as Haptics from 'expo-haptics';
import { fireEvent } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../../jest/feature-ui-source';
import { locales, renderUi } from '../../../../../jest/render-ui';
import { QuranFontPicker } from './QuranFontPicker';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));

describe('QuranFontPicker', () => {
  beforeEach(() => {
    jest.mocked(Haptics.selectionAsync).mockClear();
  });

  it.each(locales)('renders both fonts with their names and subtitles in %s', async (locale) => {
    const view = await renderUi(<QuranFontPicker onChange={() => undefined} value="amiriQuran" />, { locale });
    expect(view.getByText(locale === 'ar' ? 'أميري' : 'Amiri')).toBeOnTheScreen();
    expect(view.getByText(locale === 'ar' ? 'شهرزاد' : 'Scheherazade')).toBeOnTheScreen();
    expect(
      view.getByText(locale === 'ar' ? 'الرسم العثماني · خط شهرزاد الجديد' : 'Uthmani script, Scheherazade New font'),
    ).toBeOnTheScreen();
  });

  it('is a labelled radio group with the chosen font checked', async () => {
    const view = await renderUi(<QuranFontPicker onChange={() => undefined} value="scheherazadeNew" />);
    const group = view.getByTestId('reader-font-picker');
    expect(group.props.accessibilityRole).toBe('radiogroup');
    expect(group.props.accessibilityLabel).toBe('خط المصحف');
    const radios = view.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(view.getByTestId('reader-font-picker-amiriQuran').props.accessibilityState?.checked).toBe(false);
    expect(view.getByTestId('reader-font-picker-scheherazadeNew').props.accessibilityState?.checked).toBe(true);
  });

  it('reports a new font with a selection haptic', async () => {
    const onChange = jest.fn();
    const view = await renderUi(<QuranFontPicker onChange={onChange} value="amiriQuran" />);
    await fireEvent.press(view.getByTestId('reader-font-picker-scheherazadeNew'));
    expect(onChange).toHaveBeenCalledWith('scheherazadeNew');
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the chosen font is pressed again', async () => {
    const onChange = jest.fn();
    const view = await renderUi(<QuranFontPicker onChange={onChange} value="amiriQuran" />);
    await fireEvent.press(view.getByTestId('reader-font-picker-amiriQuran'));
    expect(onChange).not.toHaveBeenCalled();
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/settings/components/QuranFontPicker.tsx')).toEqual([]);
  });
});
