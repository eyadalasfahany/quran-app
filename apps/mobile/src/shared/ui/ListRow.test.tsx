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

  it('can drop the chevron when the trailing content already says where it goes', async () => {
    const view = await renderUi(<ListRow chevron={false} onPress={() => undefined} title="البقرة" />);

    expect(view.getByRole('button')).toBeOnTheScreen();
    expect(view.queryByTestId('list-row-chevron', { includeHiddenElements: true })).toBeNull();
  });

  it('sets the title in Amiri with the display variant', async () => {
    const view = await renderUi(<ListRow title="البقرة" titleVariant="displaySm" />);

    expect(flatStyle(view.getByText('البقرة').props.style)).toMatchObject({ fontFamily: 'Amiri-Bold', fontSize: 20 });
  });

  it('keeps the default density at 52 pt minimum with an inset', async () => {
    const view = await renderUi(<ListRow testID="row" title="row" />);

    expect(flatStyle(view.getByTestId('row').props.style)).toMatchObject({ minHeight: 52, paddingHorizontal: 16 });
  });

  it('draws the index density at the surah index frame: 60 pt minimum, no inset, 14 pt gap', async () => {
    const view = await renderUi(<ListRow density="index" subtitle="مكية · ٧ آية" testID="row" title="الفاتحة" />);
    const style = flatStyle(view.getByTestId('row').props.style);

    expect(style).toMatchObject({ flexDirection: 'row', gap: 14, minHeight: 60 });
    expect(style.paddingHorizontal).toBeUndefined();
    expect(style.paddingVertical).toBeUndefined();
  });

  it('sets the index name at Amiri 19 / 33 and the meta at 12 pt, weight 400', async () => {
    const view = await renderUi(<ListRow density="index" subtitle="مكية · ٧ آية" title="الفاتحة" titleVariant="displaySm" />);

    expect(flatStyle(view.getByText('الفاتحة').props.style)).toMatchObject({
      fontFamily: 'Amiri-Bold',
      fontSize: 19,
      lineHeight: 33,
    });
    expect(flatStyle(view.getByText('مكية · ٧ آية').props.style)).toMatchObject({
      fontFamily: 'IBMPlexSansArabic-Regular',
      fontSize: 12,
    });
  });

  it('keeps the Amiri display size for a default-density display title', async () => {
    const view = await renderUi(<ListRow title="البقرة" titleVariant="displaySm" />);

    expect(flatStyle(view.getByText('البقرة').props.style).fontSize).toBe(20);
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('ListRow.tsx')).toEqual([]);
  });
});
