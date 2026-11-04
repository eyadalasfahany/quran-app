import { makeMutable } from 'react-native-reanimated';
import Svg from 'react-native-svg';

import { locales, renderUi, svgPaint } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { DrawnLogoLayer } from './DrawnLogoLayer';
import { polygon } from './svg-path';
import type { TaybahLogoLayer } from './taybah-logo-layers';

const outline = polygon([
  [0, 0],
  [3, 0],
  [3, 4],
]);

// A fixture layer: one drawn window over the whole 0→1 splash progress. Not logo data.
const layer: TaybahLogoLayer = {
  id: 'fixture',
  d: outline.d,
  length: outline.length,
  translate: [5, 7],
  segment: [0, 1],
};

const gold = themes.light.colors.gold;

function drawn(progress: number, locale: (typeof locales)[number] = 'ar') {
  return renderUi(
    <Svg height={20} width={20}>
      <DrawnLogoLayer
        fill={gold}
        globalProgress={makeMutable(progress)}
        layer={layer}
        strokeWidth={0.75}
        testID="logo-layer"
      />
    </Svg>,
    { locale },
  );
}

// The group's children are the fill path, then the stroke path (host elements; no test id on the fill).
function paths(group: { children: unknown }) {
  return group.children as { props: Record<string, unknown> }[];
}

describe('DrawnLogoLayer', () => {
  it('places the layer at its translate offset', async () => {
    const group = (await drawn(1)).getByTestId('logo-layer');

    expect(group.props.matrix).toEqual([1, 0, 0, 1, 5, 7]);
  });

  it('strokes the outline in the fill colour, drawn in from its progress', async () => {
    const stroke = (await drawn(1)).getByTestId('logo-layer-stroke');

    expect(stroke.props).toMatchObject({
      d: outline.d,
      stroke: svgPaint(gold),
      strokeWidth: 0.75,
    });
  });

  it('fills the traced shape in the fill colour once fully drawn', async () => {
    const group = (await drawn(1)).getByTestId('logo-layer');
    const [fill] = paths(group);

    expect(fill.props).toMatchObject({ d: layer.d, fill: svgPaint(gold), stroke: null });
    expect(fill.props.fillOpacity).toBe(1);
  });

  it('keeps the fill transparent before its window starts', async () => {
    const group = (await drawn(0)).getByTestId('logo-layer');
    const [fill] = paths(group);

    expect(fill.props.fillOpacity).toBe(0);
  });

  it.each(locales)('draws the same layer in %s', async (locale) => {
    const group = (await drawn(1, locale)).getByTestId('logo-layer');

    expect(group.props.matrix).toEqual([1, 0, 0, 1, 5, 7]);
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('DrawnLogoLayer.tsx')).toEqual([]);
  });
});
