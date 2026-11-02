import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { QiblaKaabaMarker } from './QiblaKaabaMarker';

type Rendered = Awaited<ReturnType<typeof renderUi>>;

/** The rotation in degrees of a view's transform, from its (animated or static) style. */
function rotationOf(view: Rendered, testID: string): number {
  const style = flatStyle(view.getByTestId(testID, { includeHiddenElements: true }).props.style);
  const rotate = (style.transform as { rotate: string }[] | undefined)?.find((t) => 'rotate' in t)?.rotate ?? '0deg';
  return Number(rotate.replace('deg', ''));
}

describe('QiblaKaabaMarker', () => {
  it('stays fixed at the top: no rotation on the marker or the glyph', async () => {
    const view = await renderUi(<QiblaKaabaMarker />);

    expect(rotationOf(view, 'qibla-compass-marker')).toBe(0);
    expect(rotationOf(view, 'qibla-compass-marker-glyph')).toBe(0);
  });

  it('sits on the r=130 orbit at the top: a 64 px box centred at (168, 38), in LTR', async () => {
    // Under LTR the translate is the box's left edge; in RTL it is measured from the right (see dialPlacement).
    const view = await renderUi(<QiblaKaabaMarker />, { locale: 'en' });
    const box = view
      .getByTestId('qibla-compass-marker-glyph', { includeHiddenElements: true })
      .parent;
    expect(box).not.toBeNull();

    // The placed box is the glyph's parent: a translate from the dial's top-left corner.
    const style = flatStyle(box?.props.style);
    const translateX = (style.transform as { translateX: number }[]).find((t) => 'translateX' in t)?.translateX ?? NaN;
    const translateY = (style.transform as { translateY: number }[]).find((t) => 'translateY' in t)?.translateY ?? NaN;
    expect(style.width).toBe(64);
    expect(translateX + 32).toBeCloseTo(168, 5);
    expect(translateY + 32).toBeCloseTo(38, 5);
  });

  it('keeps the marker at the top in RTL: its physical centre is the same as in LTR', async () => {
    const view = await renderUi(<QiblaKaabaMarker />, { locale: 'ar' });
    const style = flatStyle(view.getByTestId('qibla-compass-marker-glyph', { includeHiddenElements: true }).parent?.props.style);
    const translateX = (style.transform as { translateX: number }[]).find((t) => 'translateX' in t)?.translateX ?? NaN;

    // In RTL the box is measured from the right edge of the 336 dial (dialPlacement), so its left edge is 272 + translate.
    expect(336 - 64 + translateX + 32).toBeCloseTo(168, 5);
  });

  it.each(locales)('places the marker with a translate and no left offset in %s', async (locale) => {
    const view = await renderUi(<QiblaKaabaMarker />, { locale });
    const box = view.getByTestId('qibla-compass-marker-glyph', { includeHiddenElements: true }).parent;
    const style = flatStyle(box?.props.style);

    expect(style.left).toBe(0);
    expect((style.transform as object[]).some((t) => 'translateX' in t)).toBe(true);
  });

  it('is decorative: pointer events off and hidden from accessibility', async () => {
    const view = await renderUi(<QiblaKaabaMarker />);
    const marker = view.getByTestId('qibla-compass-marker', { includeHiddenElements: true });

    expect(marker.props.pointerEvents).toBe('none');
    expect(marker.props.accessibilityElementsHidden).toBe(true);
    expect(marker.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('takes a custom test id, and derives the glyph id from it', async () => {
    const view = await renderUi(<QiblaKaabaMarker testID="custom-marker" />);

    expect(view.getByTestId('custom-marker', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(view.getByTestId('custom-marker-glyph', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/salah/components/QiblaKaabaMarker.tsx')).toEqual([]);
  });
});
