import { launchGold } from '@quran/design-tokens';
import { makeMutable } from 'react-native-reanimated';
import Svg from 'react-native-svg';

import { locales, renderUi, svgPaint } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';

import { splashMosqueStrokes, type SplashMosqueStroke as Stroke } from './splash-mosque-strokes';
import { SplashMosqueStroke } from './SplashMosqueStroke';

function strokeAt(index: number): Stroke {
  const stroke = splashMosqueStrokes[index];
  if (!stroke) throw new Error(`splash-mosque-strokes must have a stroke at ${index}`);
  return stroke;
}

const stroke = strokeAt(0);
const [start, end] = stroke.segment;

function drawn(progress: number, locale: (typeof locales)[number] = 'ar') {
  return renderUi(
    <Svg height={10} width={10}>
      <SplashMosqueStroke color={launchGold} globalProgress={makeMutable(progress)} stroke={stroke} />
    </Svg>,
    { locale },
  );
}

const path = async (progress: number) => (await drawn(progress)).getByTestId(`splash-stroke-${stroke.id}`);

describe('SplashMosqueStroke', () => {
  it('draws its centreline unfilled with the gold pen, as wide as its brush stroke', async () => {
    expect((await path(1)).props).toMatchObject({
      d: stroke.d,
      fill: null,
      stroke: svgPaint(launchGold),
      strokeWidth: stroke.width,
    });
  });

  it('keeps every pen line as fine as the logo: no line wider than the heaviest brush stroke', () => {
    // The heaviest brush stroke is about 0.95 mosque units at its fullest (6.35 canvas units on average).
    for (const line of splashMosqueStrokes) {
      expect(line.width).toBeGreaterThan(0);
      expect(line.width).toBeLessThanOrEqual(6.5);
    }
  });

  it('is hidden before its window and fully drawn after it', async () => {
    const before = await path(Math.max(0, start - 0.01));
    const after = await path(Math.min(1, end + 0.01));

    expect(before.props.strokeDasharray).toEqual([stroke.length, stroke.length]);
    expect(before.props.strokeDashoffset).toBeCloseTo(stroke.length);
    // react-native-svg drops a zero offset from the native props.
    expect(after.props.strokeDashoffset ?? 0).toBeCloseTo(0);
  });

  it('is exactly half drawn at the middle of its window, easing in and out', async () => {
    const middle = await path((start + end) / 2);

    expect(middle.props.strokeDashoffset).toBeCloseTo(stroke.length / 2);
  });

  it('draws less than a linear pen just after its window opens (the line eases in)', async () => {
    const early = await path(start + (end - start) * 0.25);

    expect(early.props.strokeDashoffset).toBeGreaterThan(stroke.length * 0.75);
  });

  it.each(locales)('draws the same centreline in %s', async (locale) => {
    expect((await drawn(1, locale)).getByTestId(`splash-stroke-${stroke.id}`).props.d).toBe(stroke.d);
  });

  it('is not an accessibility element', async () => {
    const props = (await path(1)).props;

    expect(props.accessibilityRole).toBeUndefined();
    expect(props.accessibilityLabel).toBeUndefined();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('SplashMosqueStroke.tsx')).toEqual([]);
  });
});
