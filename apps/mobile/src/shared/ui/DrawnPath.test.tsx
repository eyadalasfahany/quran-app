import { makeMutable } from 'react-native-reanimated';
import Svg from 'react-native-svg';

import { locales, renderUi, svgPaint } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { DrawnPath } from './DrawnPath';
import { polygon } from './svg-path';

const triangle = polygon([
  [0, 0],
  [3, 0],
  [3, 4],
]);

function drawn(progress: number, locale: (typeof locales)[number] = 'ar') {
  return renderUi(
    <Svg height={10} width={10}>
      <DrawnPath
        outline={triangle}
        progress={makeMutable(progress)}
        stroke={themes.light.colors.gold}
        strokeWidth={0.75}
        testID="path"
      />
    </Svg>,
    { locale },
  );
}

describe('DrawnPath', () => {
  it('strokes the outline unfilled in the given colour and width', async () => {
    const path = (await drawn(1)).getByTestId('path');

    expect(path.props).toMatchObject({
      d: triangle.d,
      fill: null,
      stroke: svgPaint(themes.light.colors.gold),
      strokeWidth: 0.75,
    });
  });

  // react-native-svg drops a zero offset from the native props.
  it.each([
    [0, 12],
    [0.25, 9],
    [1, 0],
  ])('at progress %s hides %s of the 12-long outline', async (progress, hidden) => {
    const path = (await drawn(progress)).getByTestId('path');

    expect(path.props.strokeDasharray).toEqual([triangle.length, triangle.length]);
    expect(path.props.strokeDashoffset ?? 0).toBeCloseTo(hidden);
  });

  it.each(locales)('draws the same outline in %s', async (locale) => {
    expect((await drawn(1, locale)).getByTestId('path').props.d).toBe(triangle.d);
  });

  it('is not an accessibility element', async () => {
    const path = (await drawn(1)).getByTestId('path');

    expect(path.props.accessibilityRole).toBeUndefined();
    expect(path.props.accessibilityLabel).toBeUndefined();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('DrawnPath.tsx')).toEqual([]);
  });
});
