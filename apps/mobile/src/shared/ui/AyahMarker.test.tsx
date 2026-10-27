import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { AyahMarker } from './AyahMarker';

const colors = themes.light.colors;

describe('AyahMarker', () => {
  it.each(locales)('always draws Arabic-Indic digits in Amiri (%s)', async (locale) => {
    const view = await renderUi(<AyahMarker number={255} />, { locale });
    const numeral = view.getByText('٢٥٥');

    expect(flatStyle(numeral.props.style)).toMatchObject({ fontFamily: 'Amiri-Regular', fontSize: 14 });
    expect(flatStyle(numeral.props.style).fontWeight).toBeUndefined();
    expect(numeral.props.allowFontScaling).toBe(false);
  });

  it.each([
    ['ar', 'الآية ٥'],
    ['en', 'Ayah 5'],
  ] as const)('labels the ayah number for screen readers in %s', async (locale, label) => {
    const view = await renderUi(<AyahMarker number={5} onPress={() => undefined} />, { locale });

    expect(view.getByRole('button', { name: label })).toBeOnTheScreen();
  });

  it('rests as a gold ring', async () => {
    const view = await renderUi(<AyahMarker number={1} testID="marker" />);

    expect(flatStyle(view.getByTestId('marker').props.style)).toMatchObject({
      backgroundColor: 'transparent',
      borderColor: colors.gold,
      height: 28,
      width: 28,
    });
    expect(flatStyle(view.getByText('١').props.style).color).toBe(colors.ink);
  });

  it('fills with brand when active, never gold', async () => {
    const view = await renderUi(<AyahMarker active number={5} onPress={() => undefined} testID="marker" />);

    expect(flatStyle(view.getByTestId('marker').props.style)).toMatchObject({
      backgroundColor: colors.brand,
      borderColor: colors.brand,
    });
    expect(flatStyle(view.getByText('٥').props.style).color).toBe(colors.onBrand);
    expect(view.getByRole('button').props.accessibilityState).toMatchObject({ selected: true });
  });

  it('opens ayah actions on press through a 44 pt target', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<AyahMarker number={2} onPress={onPress} testID="marker" />);
    const marker = view.getByRole('button');

    expect(28 + 2 * marker.props.hitSlop).toBeGreaterThanOrEqual(44);

    await fireEvent.press(marker);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is plain text when it has no action', async () => {
    const view = await renderUi(<AyahMarker number={3} />);

    expect(view.queryByRole('button')).toBeNull();
    expect(view.getByRole('text', { name: 'الآية ٣' })).toBeOnTheScreen();
  });

  it('follows the reader font scale', async () => {
    const view = await renderUi(<AyahMarker fontScale={1.5} number={7} testID="marker" />);

    expect(flatStyle(view.getByTestId('marker').props.style)).toMatchObject({ height: 42, width: 42 });
    expect(flatStyle(view.getByText('٧').props.style).fontSize).toBe(21);
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('AyahMarker.tsx')).toEqual([]);
  });
});
