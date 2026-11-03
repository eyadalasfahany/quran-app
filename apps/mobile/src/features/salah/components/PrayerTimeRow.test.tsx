import { Text } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { themes } from '@/core/theme';

import { PrayerTimeRow } from './PrayerTimeRow';

describe('PrayerTimeRow', () => {
  it('is memoised, so the times card does not re-render rows whose props did not change', () => {
    expect((PrayerTimeRow as unknown as { $$typeof: symbol }).$$typeof).toBe(Symbol.for('react.memo'));
  });

  it.each(locales)('renders the prayer name, glyph and time (%s)', async (locale) => {
    const view = await renderUi(<PrayerTimeRow name="الفجر" prayerKey="fajr" testID="row" time="٥:١٠" />, { locale });

    expect(view.getByText('الفجر')).toBeTruthy();
    expect(view.getByText('٥:١٠')).toBeTruthy();
    expect(view.getByTestId('row-icon')).toBeTruthy();
  });

  it('renders the bell node it is given instead of the empty slot', async () => {
    const view = await renderUi(
      <PrayerTimeRow bell={<Text testID="row-bell">bell</Text>} name="الفجر" prayerKey="fajr" testID="row" time="٥:١٠" />,
    );

    expect(view.getByTestId('row-bell')).toBeTruthy();
    expect(view.queryByTestId('row-bell-slot')).toBeNull();
  });

  it('keeps an empty 44 pt slot for الشروق, which has no bell', async () => {
    const view = await renderUi(<PrayerTimeRow muted name="الشروق" prayerKey="sunrise" testID="row" time="٦:٢٥" />);

    const slot = view.getByTestId('row-bell-slot');
    expect(flatStyle(slot.props.style).width).toBe(44);
    expect(flatStyle(slot.props.style).height).toBe(44);
    expect(view.queryByTestId('row-bell')).toBeNull();
  });

  it('highlights the active row with fill, brand bar and upcoming badge', async () => {
    const view = await renderUi(<PrayerTimeRow active name="المغرب" prayerKey="maghrib" testID="row" time="٥:٤٧" />);

    expect(flatStyle(view.getByTestId('row').props.style).backgroundColor).toBe(themes.light.colors.fillSecondary);
    expect(view.getByTestId('row-active-bar')).toBeTruthy();
    expect(view.getByTestId('row-badge')).toHaveTextContent('القادمة');
    expect(view.getByTestId('row-icon')).toBeTruthy();

    await view.rerender(<PrayerTimeRow name="المغرب" prayerKey="maghrib" testID="row" time="٥:٤٧" />);
    expect(view.queryByTestId('row-active-bar')).toBeNull();
    expect(view.queryByTestId('row-badge')).toBeNull();
  });

  it('drops the separator on the last row', async () => {
    const view = await renderUi(<PrayerTimeRow name="العشاء" prayerKey="isha" testID="row" time="٧:١٧" />);
    expect(flatStyle(view.getByTestId('row').props.style).borderBottomWidth).toBe(themes.light.stroke.hairline);

    await view.rerender(<PrayerTimeRow last name="العشاء" prayerKey="isha" testID="row" time="٧:١٧" />);
    expect(flatStyle(view.getByTestId('row').props.style).borderBottomWidth).toBe(0);
  });

  it('uses muted ink on past rows', async () => {
    const view = await renderUi(<PrayerTimeRow name="الفجر" past prayerKey="fajr" testID="row" time="٥:١٠" />);

    expect(flatStyle(view.getByText('الفجر').props.style).color).toBe(themes.light.colors.inkMuted);
  });

  it('hides the empty bell slot from accessibility', async () => {
    const view = await renderUi(<PrayerTimeRow muted name="الشروق" prayerKey="sunrise" testID="row" time="٦:٢٥" />);

    const slot = view.getByTestId('row-bell-slot');
    expect(slot.props.accessible).toBe(false);
    expect(slot.props.importantForAccessibility).toBe('no');
  });
});
