import { fireEvent, within } from '@testing-library/react-native';
import { Switch, Text } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { ListRow } from './ListRow';

const colors = themes.light.colors;
const hidden = { includeHiddenElements: true };

describe('ListRow', () => {
  it('renders a title and subtitle without a chevron when it does not navigate', async () => {
    const view = await renderUi(<ListRow subtitle="مكية · ٧ آيات" testID="row" title="الفاتحة" />);

    expect(view.getByText('الفاتحة')).toBeOnTheScreen();
    expect(flatStyle(view.getByText('مكية · ٧ آيات').props.style).color).toBe(colors.inkMuted);
    expect(view.queryByRole('button')).toBeNull();
    expect(view.queryByTestId('list-row-chevron', hidden)).toBeNull();
    expect(flatStyle(view.getByTestId('row').props.style).minHeight).toBeGreaterThanOrEqual(44);
  });

  it('renders leading and trailing content', async () => {
    const view = await renderUi(
      <ListRow
        leading={<Text>١</Text>}
        title="الوضع الداكن تلقائيًا بعد المغرب"
        trailing={<Switch accessibilityLabel="الوضع الداكن تلقائيًا بعد المغرب" value />}
      />,
    );

    expect(view.getByText('١')).toBeOnTheScreen();
    expect(view.getByRole('switch')).toBeOnTheScreen();
  });

  it('is a labelled button with a chevron when it navigates', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<ListRow onPress={onPress} subtitle="التفسير الميسر" title="التفسير الافتراضي" />);
    const row = view.getByRole('button', { name: 'التفسير الافتراضي, التفسير الميسر' });

    expect(within(row).getByTestId('list-row-chevron', hidden)).toBeOnTheScreen();

    await fireEvent.press(row);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('points the chevron forward in the reading direction (%s)', async (locale) => {
    const view = await renderUi(<ListRow onPress={() => undefined} title="row" />, { locale });

    expect(flatStyle(view.getByTestId('list-row-chevron', hidden).props.style).transform).toEqual(
      locale === 'ar' ? [{ scaleX: -1 }] : undefined,
    );
  });

  it.each([
    ['line', colors.line],
    ['strong', colors.lineStrong],
  ] as const)('draws a %s separator', async (separator, color) => {
    const view = await renderUi(<ListRow separator={separator} testID="row" title="row" />);

    expect(flatStyle(view.getByTestId('row').props.style)).toMatchObject({
      borderBottomColor: color,
      borderBottomWidth: 1,
    });
  });

  it('has no separator by default', async () => {
    const view = await renderUi(<ListRow testID="row" title="row" />);

    expect(flatStyle(view.getByTestId('row').props.style).borderBottomWidth).toBeUndefined();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('ListRow.tsx')).toEqual([]);
  });
});
