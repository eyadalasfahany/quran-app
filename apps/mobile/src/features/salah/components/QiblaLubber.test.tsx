import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { QiblaLubber } from './QiblaLubber';

describe('QiblaLubber', () => {
  it('renders the fixed tick at the top of the dial', async () => {
    const view = await renderUi(<QiblaLubber />);

    const style = flatStyle(view.getByTestId('qibla-compass-lubber', { includeHiddenElements: true }).props.style);
    expect(view.getByTestId('qibla-compass-lubber', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(style.position).toBe('absolute');
    expect(style.top).toBe(0);
  });

  it.each(locales)('is centred on the 336 dial in %s (the tick is placed by a translate, not left)', async (locale) => {
    const view = await renderUi(<QiblaLubber />, { locale });

    const style = flatStyle(view.getByTestId('qibla-compass-lubber', { includeHiddenElements: true }).props.style);
    const translateX = (style.transform as { translateX: number }[]).find((t) => 'translateX' in t)?.translateX ?? 0;
    const width = style.width as number;
    // Where React Native draws it: the anchor is the right edge in RTL, the left edge otherwise.
    const edge = locale === 'ar' ? 336 - width - (style.left as number) : (style.left as number);
    expect(style.left).toBe(0);
    expect(edge + translateX + width / 2).toBeCloseTo(168, 5);
  });

  it('takes a custom test id', async () => {
    const view = await renderUi(<QiblaLubber testID="custom-lubber" />);

    expect(view.getByTestId('custom-lubber', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('is decorative: no pointer events and hidden from accessibility', async () => {
    const view = await renderUi(<QiblaLubber />);

    const tick = view.getByTestId('qibla-compass-lubber', { includeHiddenElements: true });
    expect(tick.props.pointerEvents).toBe('none');
    expect(tick.props.accessibilityElementsHidden).toBe(true);
  });

  it.each(locales)('renders in %s', async (locale) => {
    const view = await renderUi(<QiblaLubber />, { locale });

    expect(view.getByTestId('qibla-compass-lubber', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it.each(['light', 'dark'] as const)('renders in the %s theme (its gold comes from tokens)', async (theme) => {
    const view = await renderUi(<QiblaLubber />, { theme });

    expect(view.getByTestId('qibla-compass-lubber', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/salah/components/QiblaLubber.tsx')).toEqual([]);
  });
});
