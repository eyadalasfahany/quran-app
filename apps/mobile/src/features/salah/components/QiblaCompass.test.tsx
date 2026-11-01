import type { SharedValue } from 'react-native-reanimated';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { QiblaCompass } from './QiblaCompass';

// Reanimated runs on jest-expo's resolver: shared values are plain objects and
// withSpring returns its target immediately, so animated styles are assertable.

/** A heading SharedValue as useQiblaHeading provides it; the value is what the needle reads. */
const headingAt = (value: number): SharedValue<number> => ({ value }) as unknown as SharedValue<number>;

/** The needle's current rotation in degrees, from its animated style. */
function needleRotation(view: Awaited<ReturnType<typeof renderUi>>): number {
  const style = flatStyle(view.getByTestId('qibla-compass-needle').props.style);
  const rotate = (style.transform as { rotate: string }[]).find((t) => 'rotate' in t)?.rotate ?? '0deg';
  return Number(rotate.replace('deg', ''));
}

describe('QiblaCompass', () => {
  it('renders the dial with its a11y label in Arabic-Indic degrees', async () => {
    const view = await renderUi(
      <QiblaCompass aligned={false} bearing={244} heading={headingAt(0)} live={false} reduceMotion={false} />,
    );

    expect(view.getByLabelText('اتجاه القبلة: ٢٤٤ درجة')).toBeOnTheScreen();
  });

  it('draws the cardinals and the eight degree numerals', async () => {
    const view = await renderUi(
      <QiblaCompass aligned={false} bearing={244} heading={headingAt(0)} live={false} reduceMotion={false} />,
    );

    for (const cardinal of ['ش', 'ج', 'غ', 'ق']) {
      expect(view.getByText(cardinal)).toBeOnTheScreen();
    }
    for (const numeral of ['٣٠', '٦٠', '١٢٠', '١٥٠', '٢١٠', '٢٤٠', '٣٠٠', '٣٣٠']) {
      expect(view.getByText(numeral)).toBeOnTheScreen();
    }
  });

  it.each(locales)('localizes cardinals and numerals in %s', async (locale) => {
    const view = await renderUi(
      <QiblaCompass aligned={false} bearing={244} heading={headingAt(0)} live={false} reduceMotion={false} />,
      { locale },
    );

    const cardinals = locale === 'ar' ? ['ش', 'ج', 'غ', 'ق'] : ['N', 'S', 'W', 'E'];
    for (const cardinal of cardinals) {
      expect(view.getByText(cardinal)).toBeOnTheScreen();
    }
    expect(view.getByText(locale === 'ar' ? '٣٠' : '30')).toBeOnTheScreen();
  });

  it('parks the Kaaba marker on the arc at the bearing', async () => {
    const view = await renderUi(
      <QiblaCompass aligned={false} bearing={244} heading={headingAt(0)} live={false} reduceMotion={false} />,
    );

    const marker = view.getByTestId('qibla-compass-marker');
    const rotate = (flatStyle(marker.props.style).transform as { rotate: string }[]).find((t) => 'rotate' in t);
    expect(rotate?.rotate).toBe('244deg');
  });

  it('rests the needle on the marker when the dial is static (no compass heading)', async () => {
    const view = await renderUi(
      <QiblaCompass aligned={false} bearing={244} heading={headingAt(0)} live={false} reduceMotion={false} />,
    );

    expect(needleRotation(view)).toBe(244);
  });

  it('rests the needle on the marker under Reduce Motion even with a live heading', async () => {
    const view = await renderUi(
      <QiblaCompass aligned={false} bearing={244} heading={headingAt(10)} live reduceMotion />,
    );

    expect(needleRotation(view)).toBe(244);
  });

  // Live-heading rotation is covered where it can be asserted: the needleAngleFor and
  // shortestTurn unit tests. The reanimated Jest mock freezes animated styles at render,
  // so a spring that lands after the effect never reaches the rendered style here.

  it('draws the aligned halo only while aligned', async () => {
    const view = await renderUi(
      <QiblaCompass aligned bearing={244} heading={headingAt(244)} live reduceMotion={false} />,
    );

    expect(view.getByTestId('qibla-compass-aligned-halo')).toBeOnTheScreen();

    await view.rerender(
      <QiblaCompass aligned={false} bearing={244} heading={headingAt(100)} live reduceMotion={false} />,
    );
    expect(view.queryByTestId('qibla-compass-aligned-halo')).toBeNull();
  });

  it('keeps the Kaaba marker and dial labels when only the heading changes', async () => {
    const view = await renderUi(
      <QiblaCompass aligned={false} bearing={244} heading={headingAt(10)} live reduceMotion={false} />,
    );

    await view.rerender(
      <QiblaCompass aligned={false} bearing={244} heading={headingAt(90)} live reduceMotion={false} />,
    );

    expect(view.getByTestId('qibla-compass-marker')).toBeOnTheScreen();
    expect(view.getByText('ش')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/salah/components/QiblaCompass.tsx')).toEqual([]);
  });
});
