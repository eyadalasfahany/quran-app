import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { SearchField } from './SearchField';

const colors = themes.light.colors;

function field({
  value = '',
  onChangeText = () => undefined,
  onSubmit = () => undefined,
}: {
  value?: string;
  onChangeText?: (text: string) => void;
  onSubmit?: (text: string) => void;
} = {}) {
  return (
    <SearchField
      onChangeText={onChangeText}
      onSubmit={onSubmit}
      placeholder="ابحث في القرآن"
      testID="search"
      value={value}
    />
  );
}

describe('SearchField', () => {
  it('renders an empty field labelled by its placeholder, with no clear button', async () => {
    const view = await renderUi(field());
    const input = view.getByTestId('search-input');

    expect(input.props.accessibilityLabel).toBe('ابحث في القرآن');
    expect(input.props.dynamicTypeRamp).toBe('body');
    expect(input.props.placeholder).toBe('ابحث في القرآن');
    expect(input.props.placeholderTextColor).toBe(colors.inkMuted);
    expect(input.props.returnKeyType).toBe('search');
    expect(view.queryByTestId('search-clear')).toBeNull();
    expect(flatStyle(view.getByTestId('search').props.style).minHeight).toBeGreaterThanOrEqual(44);
  });

  it('passes typed text up', async () => {
    const onChangeText = jest.fn();
    const view = await renderUi(field({ onChangeText }));

    await fireEvent.changeText(view.getByTestId('search-input'), 'الرحمن');

    expect(onChangeText).toHaveBeenCalledWith('الرحمن');
  });

  it('submits the current value', async () => {
    const onSubmit = jest.fn();
    const view = await renderUi(field({ onSubmit, value: 'الرحمن' }));

    await fireEvent(view.getByTestId('search-input'), 'submitEditing');

    expect(onSubmit).toHaveBeenCalledWith('الرحمن');
  });

  it.each([
    ['ar', 'مسح البحث'],
    ['en', 'Clear search'],
  ] as const)('shows a 44 pt clear button with a %s label once there is text', async (locale, label) => {
    const onChangeText = jest.fn();
    const view = await renderUi(field({ onChangeText, value: 'mercy' }), { locale });
    const clear = view.getByRole('button', { name: label });

    expect(flatStyle(clear.props.style)).toMatchObject({ height: 44, width: 44 });

    await fireEvent.press(clear);

    expect(onChangeText).toHaveBeenCalledWith('');
  });

  it('outlines the field in brand while focused', async () => {
    const view = await renderUi(field());

    expect(flatStyle(view.getByTestId('search').props.style).borderColor).toBe(colors.line);

    await fireEvent(view.getByTestId('search-input'), 'focus');

    expect(flatStyle(view.getByTestId('search').props.style).borderColor).toBe(colors.brand);
  });

  it.each(locales)('pads with logical start and end so it mirrors in RTL (%s)', async (locale) => {
    const view = await renderUi(field(), { locale });
    const style = flatStyle(view.getByTestId('search').props.style);

    expect(style).toMatchObject({ flexDirection: 'row', paddingStart: themes.light.space[4] });
    expect(style.paddingLeft).toBeUndefined();
    expect(style.paddingRight).toBeUndefined();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('SearchField.tsx')).toEqual([]);
  });
});
