import { renderHook } from '@testing-library/react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { QiblaArc, arcSweepFor } from './QiblaArc';

/** The full ring at r=130, the arc's dash pattern length. */
const RING = 2 * Math.PI * 130;

/** A real SharedValue, so the animated props read it on mount as they do in the app. */
async function sharedAt(initial: number): Promise<SharedValue<number>> {
  const { result } = await renderHook(() => useSharedValue(initial));
  return result.current;
}

type Rendered = Awaited<ReturnType<typeof renderUi>>;

/** A host node of the rendered JSON tree, as toJSON() returns it. */
type JsonNode = { props: Record<string, unknown>; children: (JsonNode | string)[] | null };

/** The first host node under `node` (inclusive) that `match` accepts, depth first. */
function findJsonNode(node: JsonNode | string | null | undefined, match: (candidate: JsonNode) => boolean): JsonNode | null {
  if (!node || typeof node === 'string') {
    return null;
  }
  if (match(node)) {
    return node;
  }
  for (const child of node.children ?? []) {
    const found = findJsonNode(child, match);
    if (found) {
      return found;
    }
  }
  return null;
}

/**
 * The arc's drawn circle: the host node under its wrapper that carries the dash pattern. react-native-svg turns the
 * dash string into an array and `rotation` into a transform matrix, so the helpers below read those forms.
 */
function arcCircle(view: Rendered, testID = 'qibla-compass-arc'): Record<string, unknown> {
  const wrapper = findJsonNode(view.toJSON() as JsonNode, (node) => node.props.testID === testID);
  const circle = findJsonNode(wrapper, (node) => Array.isArray(node.props.strokeDasharray));
  if (circle === null) {
    throw new Error('expected the arc circle to carry a stroke dash pattern');
  }
  return circle.props;
}

/** The dash length the arc draws, in px along the ring. */
function dashLength(view: Rendered): number {
  return Number((arcCircle(view).strokeDasharray as string[])[0]);
}

/**
 * The arc's start angle in degrees, 0…360 clockwise from the top of the screen's axis: the rotation matrix's angle. The
 * dash starts there, so north is 270 (−90) and a counter-clockwise sweep starts earlier.
 */
function startOf(view: Rendered): number {
  const [a, b] = arcCircle(view).matrix as number[];
  const degrees = (Math.atan2(b!, a!) * 180) / Math.PI;
  return ((degrees % 360) + 360) % 360;
}

describe('arcSweepFor', () => {
  it('runs the static arc clockwise from north to the bearing when not following', () => {
    expect(arcSweepFor(244, false)).toBe(244);
    expect(arcSweepFor(0, false)).toBe(0);
  });

  it('takes the shortest signed turn while following', () => {
    expect(arcSweepFor(90, true)).toBe(90);
    expect(arcSweepFor(-90, true)).toBe(-90);
    expect(arcSweepFor(244, true)).toBe(-116);
  });

  it('wraps an accumulated angle back into one turn while following', () => {
    expect(arcSweepFor(540, true)).toBe(-180);
    expect(arcSweepFor(-450, true)).toBe(-90);
  });
});

describe('QiblaArc', () => {
  it('draws the static arc from north to the bearing at rest, clockwise (today’s look)', async () => {
    const view = await renderUi(<QiblaArc angle={await sharedAt(244)} following={false} />);

    expect(startOf(view)).toBeCloseTo(270, 6);
    expect(dashLength(view)).toBeCloseTo((RING * 244) / 360, 6);
  });

  it('draws a clockwise arc from north when the live angle is positive', async () => {
    const view = await renderUi(<QiblaArc angle={await sharedAt(90)} following />);

    expect(startOf(view)).toBeCloseTo(270, 6);
    expect(dashLength(view)).toBeCloseTo(RING / 4, 6);
  });

  it('draws a counter-clockwise arc when the live angle is negative: it starts before north', async () => {
    const view = await renderUi(<QiblaArc angle={await sharedAt(-90)} following />);

    // The dash runs clockwise, so it starts 90° before north (−180 = 180) and ends at the top.
    expect(startOf(view)).toBeCloseTo(180, 6);
    expect(dashLength(view)).toBeCloseTo(RING / 4, 6);
  });

  it('keeps the round cap and the 3 px gold stroke', async () => {
    const view = await renderUi(<QiblaArc angle={await sharedAt(10)} following={false} />);

    expect(arcCircle(view).strokeLinecap).toBe(1);
    expect(arcCircle(view).strokeWidth).toBe(3);
  });

  it.each(locales)('is a centred, non-interactive layer in %s', async (locale) => {
    const view = await renderUi(<QiblaArc angle={await sharedAt(10)} following={false} />, { locale });
    const style = flatStyle(view.getByTestId('qibla-compass-arc', { includeHiddenElements: true }).props.style);

    expect(style.left).toBe(0);
    expect(style.top).toBe(0);
    expect(style.width).toBe(336);
    expect(style.height).toBe(336);
  });

  it('is decorative: pointer events off and hidden from accessibility', async () => {
    const view = await renderUi(<QiblaArc angle={await sharedAt(10)} following={false} />);
    const layer = view.getByTestId('qibla-compass-arc', { includeHiddenElements: true });

    expect(layer.props.pointerEvents).toBe('none');
    expect(layer.props.accessibilityElementsHidden).toBe(true);
    expect(layer.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('takes a custom test id', async () => {
    const view = await renderUi(<QiblaArc angle={await sharedAt(10)} following={false} testID="custom-arc" />);

    expect(view.getByTestId('custom-arc', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/salah/components/QiblaArc.tsx')).toEqual([]);
  });
});
