import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import { QiblaAlignedPill } from './QiblaAlignedPill';

const colors = themes.light.colors;

describe('QiblaAlignedPill', () => {
  it('renders the aligned message in the frame\'s gold pill', async () => {
    const view = await renderUi(<QiblaAlignedPill testID="pill" />);

    expect(view.getByText('أنت باتجاه القبلة')).toBeOnTheScreen();
    expect(flatStyle(view.getByTestId('pill').props.style)).toMatchObject({
      backgroundColor: colors.qiblaGoldSoft,
      borderColor: colors.qiblaGoldStroke,
      borderRadius: themes.light.radius.pill,
    });
  });

  it('announces itself politely to assistive technology', async () => {
    const view = await renderUi(<QiblaAlignedPill testID="pill" />);

    expect(view.getByTestId('pill').props.accessibilityLiveRegion).toBe('polite');
  });

  it.each(locales)('renders its message in %s', async (locale) => {
    const view = await renderUi(<QiblaAlignedPill />, { locale });

    expect(view.getByText(locale === 'ar' ? 'أنت باتجاه القبلة' : 'Facing the qibla')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/salah/components/QiblaAlignedPill.tsx')).toEqual([]);
  });
});
