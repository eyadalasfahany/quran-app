import { Text } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { themes } from '@/core/theme';

import { PrayerTimeRow } from './PrayerTimeRow';

const SCENE = 1;

describe('PrayerTimeRow', () => {
  it('is memoised, so the times card does not re-render rows whose props did not change', () => {
    // React.memo wraps the row: its type carries the memo tag, which is what keeps unchanged rows from re-rendering.
    expect((PrayerTimeRow as unknown as { $$typeof: symbol }).$$typeof).toBe(Symbol.for('react.memo'));
  });


  it.each(locales)('renders the prayer name and time (%s)', async (locale) => {
    const view = await renderUi(<PrayerTimeRow focusY={0.8} name="الفجر" scene={SCENE} testID="row" time="٥:١٠" />, { locale });

    expect(view.getByText('الفجر')).toBeTruthy();
    expect(view.getByText('٥:١٠')).toBeTruthy();
  });

  it('renders the bell node it is given instead of the empty slot', async () => {
    const view = await renderUi(
      <PrayerTimeRow bell={<Text testID="row-bell">bell</Text>} focusY={0.8} name="الفجر" scene={SCENE} testID="row" time="٥:١٠" />,
    );

    expect(view.getByTestId('row-bell')).toBeTruthy();
    expect(view.queryByTestId('row-bell-slot')).toBeNull();
  });

  it('keeps an empty 44 pt slot for الشروق, which has no bell', async () => {
    const view = await renderUi(<PrayerTimeRow focusY={0.53} muted name="الشروق" scene={SCENE} testID="row" time="٦:٢٥" />);

    const slot = view.getByTestId('row-bell-slot');
    expect(flatStyle(slot.props.style).width).toBe(44);
    expect(flatStyle(slot.props.style).height).toBe(44);
    expect(view.queryByTestId('row-bell')).toBeNull();
  });

  it('draws the brand bar and tint on the active row only', async () => {
    const view = await renderUi(<PrayerTimeRow active focusY={0.57} name="المغرب" scene={SCENE} testID="row" time="٥:٤٧" />);

    expect(view.getByTestId('row-active-bar')).toBeTruthy();
    expect(flatStyle(view.getByTestId('row-active-bar').props.style).backgroundColor).toBe(themes.light.colors.brand);

    await view.rerender(<PrayerTimeRow focusY={0.57} name="المغرب" scene={SCENE} testID="row" time="٥:٤٧" />);
    expect(view.queryByTestId('row-active-bar')).toBeNull();
  });

  it('drops the separator on the last row', async () => {
    const view = await renderUi(<PrayerTimeRow focusY={0.39} name="العشاء" scene={SCENE} testID="row" time="٧:١٧" />);
    expect(flatStyle(view.getByTestId('row').props.style).borderBottomWidth).toBe(themes.light.stroke.hairline);

    await view.rerender(<PrayerTimeRow focusY={0.39} last name="العشاء" scene={SCENE} testID="row" time="٧:١٧" />);
    expect(flatStyle(view.getByTestId('row').props.style).borderBottomWidth).toBe(0);
  });

  it('veils the photo with the raised surface, lighter in dark mode', async () => {
    const view = await renderUi(<PrayerTimeRow focusY={0.43} name="العصر" scene={SCENE} testID="row" time="٣:١٥" />);
    expect(flatStyle(view.getByTestId('row-scrim').props.style).backgroundColor).toBe(`${themes.light.colors.surfaceRaised}8F`);

    await view.rerender(<PrayerTimeRow focusY={0.43} name="العصر" scene={SCENE} testID="row" time="٣:١٥" />);
    const dark = await renderUi(<PrayerTimeRow focusY={0.43} name="العصر" scene={SCENE} testID="row" time="٣:١٥" />, { theme: 'dark' });
    expect(flatStyle(dark.getByTestId('row-scrim').props.style).backgroundColor).toBe(`${themes.dark.colors.surfaceRaised}70`);
  });
});
