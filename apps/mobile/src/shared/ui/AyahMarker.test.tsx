import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { AyahMarker } from './AyahMarker';

const colors = themes.light.colors;
// The ornament is hidden from screen readers (the marker carries the label), so queries opt in to see it.
const hidden = { includeHiddenElements: true };

describe('AyahMarker', () => {
  it.each(locales)('draws the end-of-ayah ornament around Arabic-Indic digits (%s)', async (locale) => {
    const view = await renderUi(<AyahMarker number={255} testID="marker" />, { locale });
    const [mark] = view.getByTestId('marker').children;
    const markProps = typeof mark === 'object' ? mark.props : {};

    expect(markProps.children.slice(0, 2)).toEqual(['\u200F', '\uFD3F']);
    expect(markProps.children[3]).toBe('\uFD3E');
    expect(view.getByText('٢٥٥', hidden)).toBeOnTheScreen();
    expect(flatStyle(markProps.style)).toMatchObject({ fontFamily: 'AmiriQuran', fontSize: 28 });
    expect(markProps.allowFontScaling).toBe(false);
  });

  it.each([
    ['ar', 'الآية ٥'],
    ['en', 'Ayah 5'],
  ] as const)('labels the ayah number for screen readers in %s', async (locale, label) => {
    const view = await renderUi(<AyahMarker number={5} onPress={() => undefined} />, { locale });

    expect(view.getByRole('button', { name: label })).toBeOnTheScreen();
  });

  it('rests with gold ornaments and an ink number', async () => {
    const view = await renderUi(<AyahMarker number={1} testID="marker" />);
    const [mark] = view.getByTestId('marker').children;

    expect(flatStyle(typeof mark === 'object' ? mark.props.style : undefined).color).toBe(colors.gold);
    expect(flatStyle(view.getByText('١', hidden).props.style).color).toBe(colors.ink);
  });

  it('turns brand when active, never gold', async () => {
    const view = await renderUi(<AyahMarker active number={5} onPress={() => undefined} testID="marker" />);
    const [mark] = view.getByTestId('marker').children;

    expect(flatStyle(typeof mark === 'object' ? mark.props.style : undefined).color).toBe(colors.brand);
    expect(flatStyle(view.getByText('٥', hidden).props.style).color).toBe(colors.brand);
    expect(view.getByRole('button').props.accessibilityState).toMatchObject({ selected: true });
  });

  it('is one element for screen readers: the ornament inside is hidden', async () => {
    const view = await renderUi(<AyahMarker number={4} onPress={() => undefined} />);

    expect(view.getAllByLabelText('الآية ٤')).toHaveLength(1);
    expect(view.queryByText('٤')).toBeNull();
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

    const [mark] = view.getByTestId('marker').children;

    expect(flatStyle(view.getByTestId('marker').props.style).minHeight).toBe(42);
    expect(flatStyle(typeof mark === 'object' ? mark.props.style : undefined).fontSize).toBe(42);
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('AyahMarker.tsx')).toEqual([]);
  });
});
