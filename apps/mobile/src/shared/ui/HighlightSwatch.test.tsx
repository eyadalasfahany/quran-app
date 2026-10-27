import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { i18n } from '@/core/i18n';
import { themes } from '@/core/theme';

import { HighlightSwatch } from './HighlightSwatch';

const colors = themes.light.colors;
const hidden = { includeHiddenElements: true };

describe('HighlightSwatch', () => {
  it.each([
    ['gold', 'تظليل ذهبي', 'Gold highlight', colors.highlightGold],
    ['green', 'تظليل أخضر', 'Green highlight', colors.highlightGreen],
    ['blue', 'تظليل أزرق', 'Blue highlight', colors.highlightBlue],
    ['rose', 'تظليل وردي', 'Rose highlight', colors.highlightRose],
  ] as const)('names the %s colour in both languages and fills from its token', async (color, ar, en, fill) => {
    const arabic = await renderUi(
      <HighlightSwatch color={color} onPress={() => undefined} selected={false} testID="sw" />,
    );

    expect(arabic.getByRole('button', { name: ar })).toBeOnTheScreen();
    expect(flatStyle(arabic.getByTestId('sw-dot').props.style)).toMatchObject({
      backgroundColor: fill,
      borderColor: colors.lineStrong,
    });
    expect(i18n.getFixedT('en')(`ui.highlight.${color}`)).toBe(en);
  });

  it('uses the English name in English', async () => {
    const view = await renderUi(<HighlightSwatch color="blue" onPress={() => undefined} selected={false} />, {
      locale: 'en',
    });

    expect(view.getByRole('button', { name: 'Blue highlight' })).toBeOnTheScreen();
  });

  it('has a 44 pt target around a 28 pt dot', async () => {
    const view = await renderUi(<HighlightSwatch color="gold" onPress={() => undefined} selected={false} testID="sw" />);

    expect(flatStyle(view.getByRole('button').props.style)).toMatchObject({ height: 44, width: 44 });
    expect(flatStyle(view.getByTestId('sw-dot').props.style)).toMatchObject({ height: 28, width: 28 });
  });

  it('shows selection with a ring, a check mark and the selected state, not colour alone', async () => {
    const view = await renderUi(<HighlightSwatch color="green" onPress={() => undefined} selected testID="sw" />);

    expect(view.getByRole('button').props.accessibilityState).toMatchObject({ selected: true });
    expect(flatStyle(view.getByTestId('sw-ring').props.style).borderColor).toBe(colors.ink);
    expect(view.getByTestId('highlight-swatch-check', hidden)).toBeOnTheScreen();
  });

  it('has no ring or check mark when not selected', async () => {
    const view = await renderUi(<HighlightSwatch color="green" onPress={() => undefined} selected={false} testID="sw" />);

    expect(view.getByRole('button').props.accessibilityState).toMatchObject({ selected: false });
    expect(flatStyle(view.getByTestId('sw-ring').props.style).borderColor).toBe('transparent');
    expect(view.queryByTestId('highlight-swatch-check', hidden)).toBeNull();
  });

  it('calls onPress', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<HighlightSwatch color="rose" onPress={onPress} selected={false} />);

    await fireEvent.press(view.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('never mirrors the check mark (%s)', async (locale) => {
    const view = await renderUi(<HighlightSwatch color="gold" onPress={() => undefined} selected />, { locale });

    expect(flatStyle(view.getByTestId('highlight-swatch-check', hidden).props.style).transform).toBeUndefined();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('HighlightSwatch.tsx')).toEqual([]);
  });
});
