import { StyleSheet } from 'react-native';
import { makeMutable } from 'react-native-reanimated';

import { locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';

import { SplashLogoRasterLayer } from './SplashLogoRasterLayer';
import { SPLASH_LOGO_VIEWBOX, splashRasterLayers } from './splash-logo-raster-layers';

const HIDDEN = { includeHiddenElements: true } as const;
const SIZE = 280;
const layer = splashRasterLayers[0];
const scale = SIZE / SPLASH_LOGO_VIEWBOX;

function band(progress: number, locale: (typeof locales)[number] = 'ar') {
  return renderUi(<SplashLogoRasterLayer globalProgress={makeMutable(progress)} layer={layer} size={SIZE} />, { locale });
}

describe('SplashLogoRasterLayer', () => {
  it('positions its reveal band at the layer offset, scaled to the rendered size', async () => {
    const view = await band(1);
    const style = StyleSheet.flatten(view.getByTestId(`splash-logo-${layer.id}`, HIDDEN).props.style);

    expect(style).toMatchObject({
      left: layer.x * scale,
      top: layer.y * scale,
      width: layer.width * scale,
      overflow: 'hidden',
      position: 'absolute',
    });
  });

  it('reveals the band top-down as its segment progresses', async () => {
    const hidden = await band(0);
    const shown = await band(1);

    expect(StyleSheet.flatten(hidden.getByTestId(`splash-logo-${layer.id}`, HIDDEN).props.style).height).toBe(0);
    expect(StyleSheet.flatten(shown.getByTestId(`splash-logo-${layer.id}`, HIDDEN).props.style).height).toBeCloseTo(
      layer.height * scale,
    );
  });

  it('shows the whole logo slice, offset so the band reveals the matching part', async () => {
    const view = await band(1);
    // The band's only child is the logo image, which carries the layer's source.
    const [image] = view.getByTestId(`splash-logo-${layer.id}`, HIDDEN).children as unknown as { props: Record<string, unknown> }[];
    expect(image.props.source).toBe(layer.source);
    const imageStyle = StyleSheet.flatten(image.props.style as never) as Record<string, number>;

    expect(imageStyle).toMatchObject({
      height: SIZE,
      width: SIZE,
      left: -layer.x * scale,
      top: -layer.y * scale,
      position: 'absolute',
    });
  });

  it.each(locales)('renders the layer in %s', async (locale) => {
    const view = await band(1, locale);

    expect(view.getByTestId(`splash-logo-${layer.id}`, HIDDEN)).toBeTruthy();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('SplashLogoRasterLayer.tsx')).toEqual([]);
  });
});
