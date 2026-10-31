import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import { CompassCalibrationNotice } from './CompassCalibrationNotice';

const colors = themes.light.colors;

describe('CompassCalibrationNotice', () => {
  it('renders the figure-8 calibration message in the frame\'s gold pill', async () => {
    const view = await renderUi(<CompassCalibrationNotice testID="notice" />);

    expect(view.getByText('حرّك جهازك على شكل ٨')).toBeOnTheScreen();
    expect(flatStyle(view.getByTestId('notice').props.style)).toMatchObject({
      backgroundColor: colors.qiblaGoldSoft,
      borderColor: colors.qiblaGoldStroke,
      borderRadius: themes.light.radius.pill,
    });
  });

  it('announces itself politely to assistive technology', async () => {
    const view = await renderUi(<CompassCalibrationNotice testID="notice" />);

    expect(view.getByTestId('notice').props.accessibilityLiveRegion).toBe('polite');
  });

  it.each(locales)('renders its message in %s', async (locale) => {
    const view = await renderUi(<CompassCalibrationNotice />, { locale });

    expect(view.getByText(locale === 'ar' ? 'حرّك جهازك على شكل ٨' : 'Move your device in a figure 8')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/salah/components/CompassCalibrationNotice.tsx')).toEqual([]);
  });
});
