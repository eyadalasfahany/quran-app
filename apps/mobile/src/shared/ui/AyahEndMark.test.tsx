import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { AyahEndMark } from './AyahEndMark';

const colors = themes.light.colors;

describe('AyahEndMark', () => {
  it.each(locales)('draws the ornate parentheses around Arabic-Indic digits in Amiri Quran (%s)', async (locale) => {
    const view = await renderUi(<AyahEndMark number={255} testID="mark" />, { locale });
    const mark = view.getByTestId('mark');

    expect(mark.props.children[1]).toBe('\uFD3F');
    expect(mark.props.children[3]).toBe('\uFD3E');
    expect(view.getByText('٢٥٥')).toBeOnTheScreen();
    expect(flatStyle(mark.props.style).fontFamily).toBe('AmiriQuran');
  });

  it('opens with a right-to-left mark, so the brackets keep their sides when the mark stands alone', async () => {
    const view = await renderUi(<AyahEndMark number={1} testID="mark" />, { locale: 'en' });

    expect(view.getByTestId('mark').props.children[0]).toBe('\u200F');
  });

  it('takes the size of the line it sits in', async () => {
    const view = await renderUi(<AyahEndMark number={1} testID="mark" />);
    const style = flatStyle(view.getByTestId('mark').props.style);

    expect(style.fontSize).toBeUndefined();
    expect(style.lineHeight).toBeUndefined();
  });

  it('takes a size when it stands alone, never scaled by the system', async () => {
    const view = await renderUi(<AyahEndMark number={1} size={28} testID="mark" />);
    const mark = view.getByTestId('mark');

    expect(flatStyle(mark.props.style)).toMatchObject({ fontSize: 28, lineHeight: 42 });
    expect(mark.props.allowFontScaling).toBe(false);
  });

  it('is hidden from screen readers when decorative', async () => {
    const view = await renderUi(<AyahEndMark decorative number={1} testID="mark" />);
    const mark = view.getByTestId('mark', { includeHiddenElements: true });

    expect(mark.props.accessibilityElementsHidden).toBe(true);
    expect(mark.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(mark.props.accessibilityLabel).toBeUndefined();
  });

  it('rests with gold ornaments and an ink number', async () => {
    const view = await renderUi(<AyahEndMark number={1} testID="mark" />);

    expect(flatStyle(view.getByTestId('mark').props.style).color).toBe(colors.gold);
    expect(flatStyle(view.getByText('١').props.style).color).toBe(colors.ink);
  });

  it('turns brand when active, never gold', async () => {
    const view = await renderUi(<AyahEndMark active number={5} onPress={() => undefined} testID="mark" />);

    expect(flatStyle(view.getByTestId('mark').props.style).color).toBe(colors.brand);
    expect(flatStyle(view.getByText('٥').props.style).color).toBe(colors.brand);
    expect(view.getByRole('button').props.accessibilityState).toMatchObject({ selected: true });
  });

  it.each([
    ['ar', 'الآية ٥'],
    ['en', 'Ayah 5'],
  ] as const)('labels the ayah number for screen readers in %s', async (locale, label) => {
    const view = await renderUi(<AyahEndMark number={5} onPress={() => undefined} />, { locale });

    expect(view.getByRole('button', { name: label })).toBeOnTheScreen();
  });

  it('calls onPress', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<AyahEndMark number={2} onPress={onPress} />);

    await fireEvent.press(view.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is plain text when it has no action', async () => {
    const view = await renderUi(<AyahEndMark number={3} />);

    expect(view.queryByRole('button')).toBeNull();
    expect(view.getByRole('text', { name: 'الآية ٣' })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('AyahEndMark.tsx')).toEqual([]);
  });
});
