import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { themes } from '@/core/theme';

import { NextPrayerHero } from './NextPrayerHero';

const PROPS = {
  prayerName: 'المغرب',
  time: '٥:٤٧',
  city: 'مكة المكرمة',
  sourceLabel: 'تلقائي',
  remaining: '١:٢٣',
  progress: 0.62,
};

describe('NextPrayerHero', () => {
  it.each(locales)('renders the eyebrow, name, place line and countdown (%s)', async (locale) => {
    const view = await renderUi(<NextPrayerHero {...PROPS} />, { locale });

    expect(view.getByTestId('salah-hero-name')).toHaveTextContent('المغرب');
    expect(view.getByTestId('salah-hero-place')).toHaveTextContent('٥:٤٧ · مكة المكرمة · تلقائي');
    expect(view.getByTestId('salah-hero-remaining')).toHaveTextContent(locale === 'ar' ? 'متبقٍ ١:٢٣' : '١:٢٣ left');
  });

  it('drops the city from the place line when location is automatic', async () => {
    const view = await renderUi(<NextPrayerHero {...PROPS} city={undefined} />);

    expect(view.getByTestId('salah-hero-place')).toHaveTextContent('٥:٤٧ · تلقائي');
  });

  it('fills the gold track by the progress fraction', async () => {
    const view = await renderUi(<NextPrayerHero {...PROPS} />);

    expect(flatStyle(view.getByTestId('salah-hero-progress').props.style).width).toBe('62%');
  });

  it('clamps an out-of-range progress', async () => {
    const view = await renderUi(<NextPrayerHero {...PROPS} progress={1.4} />);
    expect(flatStyle(view.getByTestId('salah-hero-progress').props.style).width).toBe('100%');

    await view.rerender(<NextPrayerHero {...PROPS} progress={-0.2} />);
    expect(flatStyle(view.getByTestId('salah-hero-progress').props.style).width).toBe('0%');
  });

  it('reads as one accessible block naming the prayer and the countdown', async () => {
    const view = await renderUi(<NextPrayerHero {...PROPS} />);

    expect(view.getByTestId('salah-hero').props.accessibilityLabel).toBe('الصلاة القادمة: المغرب ٥:٤٧، متبقٍ ١:٢٣');
  });

  it('keeps the light hero palette in dark mode: the green card is theme-stable', async () => {
    const view = await renderUi(<NextPrayerHero {...PROPS} />, { theme: 'dark' });

    expect(flatStyle(view.getByTestId('salah-hero').props.style).backgroundColor).toBe(themes.dark.colors.brandSurface);
  });

  it('lays the progress track out in a row so RTL fills from the start edge', async () => {
    const view = await renderUi(<NextPrayerHero {...PROPS} />);

    expect(flatStyle(view.getByTestId('salah-hero-track').props.style).flexDirection).toBe('row');
  });

  it('veils the photo with design tokens, not hard-coded rgba', async () => {
    const view = await renderUi(<NextPrayerHero {...PROPS} />);

    expect(flatStyle(view.getByTestId('salah-hero-veil').props.style).backgroundColor).toBe(themes.light.colors.salahHeroVeil);
    expect(flatStyle(view.getByTestId('salah-hero-veil-lower').props.style).backgroundColor).toBe(
      themes.light.colors.salahHeroVeilLower,
    );
  });
});
