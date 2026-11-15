import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import { MapTopFade } from './MapTopFade';

const hidden = { includeHiddenElements: true } as const;

describe('MapTopFade', () => {
  it.each(locales)('fades the page surface to the map over the given height (%s)', async (locale) => {
    await renderUi(<MapTopFade height={138} />, { locale });
    expect(flatStyle(screen.getByTestId('seerah-map-fade', hidden).props.style)).toMatchObject({
      backgroundImage: `linear-gradient(to bottom, ${themes.light.colors.surface}, transparent)`,
      height: 138,
      opacity: 0.92,
      top: 0,
    });
  });

  it.each(['light', 'dark'] as const)('reads the surface from the theme (%s)', async (theme) => {
    await renderUi(<MapTopFade height={100} />, { theme });
    expect(String(flatStyle(screen.getByTestId('seerah-map-fade', hidden).props.style).backgroundImage)).toContain(themes[theme].colors.surface);
  });

  it('is decorative: hidden from screen readers and never takes a touch', async () => {
    await renderUi(<MapTopFade height={100} />);
    const fade = screen.getByTestId('seerah-map-fade', hidden);
    expect(fade.props.accessibilityElementsHidden).toBe(true);
    expect(fade.props.pointerEvents).toBe('none');
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/MapTopFade.tsx')).toEqual([]);
  });
});
