import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { themes } from '@/core/theme';

import { PrayerRowIcon } from './PrayerRowIcon';

describe('PrayerRowIcon', () => {
  it('renders the glyph chip', async () => {
    const view = await renderUi(<PrayerRowIcon prayerKey="fajr" testID="icon" />);

    // Glyph is decorative (accessibilityElementsHidden); assert the chip only.
    expect(view.getByTestId('icon')).toBeTruthy();
    expect(flatStyle(view.getByTestId('icon').props.style).width).toBe(themes.light.size.touchTarget);
  });

  it('uses brand fill and ink when active', async () => {
    const view = await renderUi(<PrayerRowIcon active prayerKey="asr" testID="icon" />);

    expect(flatStyle(view.getByTestId('icon').props.style).backgroundColor).toBe(themes.light.colors.glassSelected);
  });

  it('uses muted fill treatment when muted', async () => {
    const view = await renderUi(<PrayerRowIcon muted prayerKey="sunrise" testID="icon" />);

    expect(flatStyle(view.getByTestId('icon').props.style).backgroundColor).toBe(themes.light.colors.fillSecondary);
  });
});
