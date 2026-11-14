import { StyleSheet } from 'react-native';
import { makeMutable } from 'react-native-reanimated';

import { locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';

import { SplashLogoRasterLayer } from './SplashLogoRasterLayer';
import { SPLASH_LOGO_VIEWBOX, splashRasterLayers, type SplashRasterLayer } from './splash-logo-raster-layers';

const HIDDEN = { includeHiddenElements: true } as const;
const SIZE = 280;
const scale = SIZE / SPLASH_LOGO_VIEWBOX;

function layerWithId(id: string): SplashRasterLayer {
  const layer = splashRasterLayers.find((candidate) => candidate.id === id);
  if (!layer) throw new Error(`splash-logo-raster-layers must export a '${id}' layer`);
  return layer;
}

// «طيبة» rises into place as it fades in, so it covers both behaviours.
const layer = layerWithId('arabic');
const [start, end] = layer.segment;

async function styleAt(progress: number, locale: (typeof locales)[number] = 'ar') {
  const view = await renderUi(
    <SplashLogoRasterLayer globalProgress={makeMutable(progress)} layer={layer} size={SIZE} />,
    { locale },
  );
  return { style: StyleSheet.flatten(view.getByTestId(`splash-logo-${layer.id}`, HIDDEN).props.style), view };
}

function translateY(style: Record<string, unknown>): number {
  const transform = (style.transform ?? []) as Record<string, number>[];
  return transform.find((step) => 'translateY' in step)?.translateY ?? 0;
}

describe('SplashLogoRasterLayer', () => {
  it('covers the whole logo square, since each layer is a full logo canvas', async () => {
    const { style } = await styleAt(1);

    expect(style).toMatchObject({ height: SIZE, left: 0, position: 'absolute', top: 0, width: SIZE });
  });

  it('is invisible and lowered before its window, in place and opaque after it', async () => {
    const before = (await styleAt(Math.max(0, start - 0.01))).style;
    const after = (await styleAt(Math.min(1, end + 0.01))).style;

    expect(before.opacity).toBe(0);
    expect(translateY(before)).toBeCloseTo(layer.rise * scale);
    expect(after.opacity).toBe(1);
    expect(translateY(after)).toBeCloseTo(0);
  });

  it('is half faded in at the middle of its window', async () => {
    const { style } = await styleAt((start + end) / 2);

    expect(style.opacity).toBeCloseTo(0.5);
  });

  it('shows its logo image at the full logo size', async () => {
    const { view } = await styleAt(1);
    const [image] = view.getByTestId(`splash-logo-${layer.id}`, HIDDEN).children as unknown as {
      props: Record<string, unknown>;
    }[];
    if (!image) throw new Error(`splash-logo-${layer.id} must render its logo image`);

    expect(image.props.source).toBe(layer.source);
    expect(StyleSheet.flatten(image.props.style as never)).toMatchObject({ height: SIZE, width: SIZE });
  });

  it('does not take touches', async () => {
    const { view } = await styleAt(1);

    expect(view.getByTestId(`splash-logo-${layer.id}`, HIDDEN).props.pointerEvents).toBe('none');
  });

  it.each(locales)('renders the layer in %s', async (locale) => {
    const { view } = await styleAt(1, locale);

    expect(view.getByTestId(`splash-logo-${layer.id}`, HIDDEN)).toBeTruthy();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('SplashLogoRasterLayer.tsx')).toEqual([]);
  });
});
