import type { ReactNode } from 'react';
import { render, within } from '@testing-library/react-native';
import type { SharedValue } from 'react-native-reanimated';

import { i18n } from '@/core/i18n';
import { ThemeProvider } from '@/core/theme';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { QiblaDial } from './QiblaDial';

// Counts how often the marker glyph renders: it sits inside the dial, so the count moves only when the dial re-renders.
const mockKaabaRenders = jest.fn();
jest.mock('./KaabaGlyph', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    KaabaGlyph: () => {
      mockKaabaRenders();
      return react.createElement(View, { testID: 'kaaba-glyph' });
    },
  };
});

/** A turn SharedValue as useDialTurn provides it: the value is what the upright layers read at render. */
const turnAt = (value: number): SharedValue<number> => ({ value }) as unknown as SharedValue<number>;

/** The rotation in degrees of a view's transform, from its (animated or static) style. */
function rotationOf(view: Awaited<ReturnType<typeof renderUi>>, testID: string): number {
  const style = flatStyle(view.getByTestId(testID).props.style);
  const rotate = (style.transform as { rotate: string }[]).find((t) => 'rotate' in t)?.rotate ?? '0deg';
  return Number(rotate.replace('deg', ''));
}

// The face at rest: no turn, so the dial is north-up.
const restTurn = turnAt(0);

describe('QiblaDial', () => {
  beforeEach(() => {
    mockKaabaRenders.mockClear();
  });

  it('draws the cardinals and the eight degree numerals', async () => {
    const view = await renderUi(<QiblaDial bearing={244} turn={restTurn} />);

    for (const cardinal of ['ش', 'ج', 'غ', 'ق']) {
      expect(view.getByText(cardinal)).toBeOnTheScreen();
    }
    for (const numeral of ['٣٠', '٦٠', '١٢٠', '١٥٠', '٢١٠', '٢٤٠', '٣٠٠', '٣٣٠']) {
      expect(view.getByText(numeral)).toBeOnTheScreen();
    }
  });

  it.each(locales)('localizes cardinals and numerals in %s', async (locale) => {
    const view = await renderUi(<QiblaDial bearing={244} turn={restTurn} />, { locale });

    expect(view.getByText(locale === 'ar' ? '٣٠' : '30')).toBeOnTheScreen();
    expect(view.getByText(locale === 'ar' ? 'ش' : 'N')).toBeOnTheScreen();
  });

  it('parks the marker on the gold arc at the bearing', async () => {
    const view = await renderUi(<QiblaDial bearing={244} turn={restTurn} />);

    expect(rotationOf(view, 'qibla-compass-marker')).toBe(244);
  });

  it('counter-rotates every cardinal and numeral by the turn, so they stay upright as the face turns', async () => {
    const view = await renderUi(<QiblaDial bearing={244} turn={turnAt(90)} />);

    // The face turns by −turn (QiblaCompass); each label turns by +turn here, so the two cancel on screen.
    expect(rotationOf(view, 'qibla-dial-label-cardinalNorth-upright')).toBe(90);
    expect(rotationOf(view, 'qibla-dial-label-cardinalWest-upright')).toBe(90);
    expect(rotationOf(view, 'qibla-dial-numeral-30-upright')).toBe(90);
    expect(rotationOf(view, 'qibla-dial-numeral-330-upright')).toBe(90);
  });

  it('keeps the Kaaba glyph upright: it counter-rotates by the turn, and by −bearing inside the marker', async () => {
    const view = await renderUi(<QiblaDial bearing={244} turn={turnAt(136)} />);

    expect(rotationOf(view, 'qibla-compass-marker-upright')).toBe(136);
    expect(rotationOf(view, 'qibla-compass-marker-glyph')).toBe(-244);
    expect(rotationOf(view, 'qibla-compass-marker')).toBe(244);
  });

  describe('label placement (regression: RTL mirrored the cardinals and numerals)', () => {
    const FACE = 336;
    const CENTRE = FACE / 2;

    /** Where React Native draws a placed label: `left` is swapped in RTL, so its anchor there is the right edge. */
    function physicalCentre(view: Awaited<ReturnType<typeof renderUi>>, testID: string, isRTL: boolean): number {
      const style = flatStyle(view.getByTestId(testID).props.style);
      const width = style.width as number;
      const translateX = (style.transform as { translateX: number }[]).find((t) => 'translateX' in t)?.translateX ?? 0;
      const edge = isRTL ? FACE - width - (style.left as number) : (style.left as number);
      return edge + translateX + width / 2;
    }

    it.each(locales)('puts ق on the east (right of centre) and غ on the west in %s', async (locale) => {
      const isRTL = locale === 'ar';
      const view = await renderUi(<QiblaDial bearing={244} turn={restTurn} />, { locale });

      expect(physicalCentre(view, 'qibla-dial-label-cardinalEast', isRTL)).toBeCloseTo(280, 5);
      expect(physicalCentre(view, 'qibla-dial-label-cardinalWest', isRTL)).toBeCloseTo(56, 5);
      expect(physicalCentre(view, 'qibla-dial-label-cardinalEast', isRTL)).toBeGreaterThan(CENTRE);
      expect(physicalCentre(view, 'qibla-dial-label-cardinalWest', isRTL)).toBeLessThan(CENTRE);
    });

    it.each(locales)('keeps each cardinal letter on its own side in %s', async (locale) => {
      const isRTL = locale === 'ar';
      const view = await renderUi(<QiblaDial bearing={244} turn={restTurn} />, { locale });

      expect(within(view.getByTestId('qibla-dial-label-cardinalEast')).getByText(isRTL ? 'ق' : 'E')).toBeOnTheScreen();
      expect(within(view.getByTestId('qibla-dial-label-cardinalWest')).getByText(isRTL ? 'غ' : 'W')).toBeOnTheScreen();
    });

    it.each(locales)('puts 30 on the right and 330 on the left in %s', async (locale) => {
      const isRTL = locale === 'ar';
      const view = await renderUi(<QiblaDial bearing={244} turn={restTurn} />, { locale });

      expect(physicalCentre(view, 'qibla-dial-numeral-30', isRTL)).toBeCloseTo(224, 5);
      expect(physicalCentre(view, 'qibla-dial-numeral-330', isRTL)).toBeCloseTo(112, 5);
      expect(physicalCentre(view, 'qibla-dial-numeral-30', isRTL)).toBeGreaterThan(CENTRE);
      expect(physicalCentre(view, 'qibla-dial-numeral-330', isRTL)).toBeLessThan(CENTRE);
    });

    it.each(locales)('places every label with a translate and no left offset, in %s', async (locale) => {
      const view = await renderUi(<QiblaDial bearing={244} turn={restTurn} />, { locale });

      for (const testID of [
        'qibla-dial-label-cardinalNorth',
        'qibla-dial-label-cardinalSouth',
        'qibla-dial-label-cardinalWest',
        'qibla-dial-label-cardinalEast',
        'qibla-dial-numeral-30',
        'qibla-dial-numeral-330',
      ]) {
        const style = flatStyle(view.getByTestId(testID).props.style);
        expect(style.left).toBe(0);
        expect((style.transform as object[]).some((t) => 'translateX' in t)).toBe(true);
      }
    });
  });

  // A plain renderUi rerender would swap the root (its ThemeProvider), which remounts the dial. The wrapper keeps the
  // provider in place so only the dial's own memo decides whether it renders again.
  const themed = ({ children }: { children: ReactNode }) => <ThemeProvider name="light">{children}</ThemeProvider>;

  beforeAll(async () => {
    await i18n.changeLanguage('ar');
  });

  it('does not re-render when re-rendered with the same bearing and turn (memoised)', async () => {
    const view = await render(<QiblaDial bearing={244} turn={restTurn} />, { wrapper: themed });
    const afterMount = mockKaabaRenders.mock.calls.length;

    await view.rerender(<QiblaDial bearing={244} turn={restTurn} />);

    expect(mockKaabaRenders.mock.calls.length).toBe(afterMount);
  });

  it('re-renders when the bearing changes', async () => {
    const view = await render(<QiblaDial bearing={244} turn={restTurn} />, { wrapper: themed });
    const afterMount = mockKaabaRenders.mock.calls.length;

    await view.rerender(<QiblaDial bearing={100} turn={restTurn} />);

    expect(mockKaabaRenders.mock.calls.length).toBeGreaterThan(afterMount);
    expect(rotationOf(view, 'qibla-compass-marker')).toBe(100);
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/salah/components/QiblaDial.tsx')).toEqual([]);
  });
});
