import type { ReactNode } from 'react';
import { render, within } from '@testing-library/react-native';

import { i18n } from '@/core/i18n';
import { ThemeProvider } from '@/core/theme';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { QiblaDial } from './QiblaDial';

// Counts how often a label renders: the labels sit in the face, so the count moves only when the face re-renders.
const mockLabelRenders = jest.fn();
jest.mock('@/shared/ui/UiText', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  const actual = jest.requireActual<typeof import('@/shared/ui/UiText')>('@/shared/ui/UiText');
  return {
    ...actual,
    UiText: (props: Parameters<typeof actual.UiText>[0]) => {
      mockLabelRenders();
      return react.createElement(actual.UiText, props);
    },
  };
});

/** The rotate transforms of a view's style: the face and its labels carry none. */
function rotatesOf(view: Awaited<ReturnType<typeof renderUi>>, testID: string): unknown[] {
  const style = flatStyle(view.getByTestId(testID).props.style);
  return ((style.transform ?? []) as object[]).filter((t) => 'rotate' in t);
}

describe('QiblaDial (the static face)', () => {
  beforeEach(() => {
    mockLabelRenders.mockClear();
  });

  it('draws the cardinals and the eight degree numerals', async () => {
    const view = await renderUi(<QiblaDial />);

    for (const cardinal of ['ش', 'ج', 'غ', 'ق']) {
      expect(view.getByText(cardinal)).toBeOnTheScreen();
    }
    for (const numeral of ['٣٠', '٦٠', '١٢٠', '١٥٠', '٢١٠', '٢٤٠', '٣٠٠', '٣٣٠']) {
      expect(view.getByText(numeral)).toBeOnTheScreen();
    }
  });

  it.each(locales)('localizes cardinals and numerals in %s', async (locale) => {
    const view = await renderUi(<QiblaDial />, { locale });

    expect(view.getByText(locale === 'ar' ? '٣٠' : '30')).toBeOnTheScreen();
    expect(view.getByText(locale === 'ar' ? 'ش' : 'N')).toBeOnTheScreen();
  });

  it('never turns: the labels carry no rotation, so the cardinals and numerals are a fixed reference ring', async () => {
    const view = await renderUi(<QiblaDial />);

    for (const testID of [
      'qibla-dial-label-cardinalNorth',
      'qibla-dial-label-cardinalWest',
      'qibla-dial-numeral-30',
      'qibla-dial-numeral-330',
    ]) {
      expect(rotatesOf(view, testID)).toEqual([]);
    }
  });

  it('carries no Kaaba marker: that is a separate layer above the face', async () => {
    const view = await renderUi(<QiblaDial />);

    expect(view.queryByTestId('qibla-compass-marker', { includeHiddenElements: true })).toBeNull();
  });

  it('takes no props: the face is the same whatever the compass does', async () => {
    const first = await renderUi(<QiblaDial />);
    const second = await renderUi(<QiblaDial />);

    expect(first.toJSON()).toEqual(second.toJSON());
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
      const view = await renderUi(<QiblaDial />, { locale });

      expect(physicalCentre(view, 'qibla-dial-label-cardinalEast', isRTL)).toBeCloseTo(280, 5);
      expect(physicalCentre(view, 'qibla-dial-label-cardinalWest', isRTL)).toBeCloseTo(56, 5);
      expect(physicalCentre(view, 'qibla-dial-label-cardinalEast', isRTL)).toBeGreaterThan(CENTRE);
      expect(physicalCentre(view, 'qibla-dial-label-cardinalWest', isRTL)).toBeLessThan(CENTRE);
    });

    it.each(locales)('keeps each cardinal letter on its own side in %s', async (locale) => {
      const isRTL = locale === 'ar';
      const view = await renderUi(<QiblaDial />, { locale });

      expect(within(view.getByTestId('qibla-dial-label-cardinalEast')).getByText(isRTL ? 'ق' : 'E')).toBeOnTheScreen();
      expect(within(view.getByTestId('qibla-dial-label-cardinalWest')).getByText(isRTL ? 'غ' : 'W')).toBeOnTheScreen();
    });

    it.each(locales)('puts 30 on the right and 330 on the left in %s', async (locale) => {
      const isRTL = locale === 'ar';
      const view = await renderUi(<QiblaDial />, { locale });

      expect(physicalCentre(view, 'qibla-dial-numeral-30', isRTL)).toBeCloseTo(224, 5);
      expect(physicalCentre(view, 'qibla-dial-numeral-330', isRTL)).toBeCloseTo(112, 5);
      expect(physicalCentre(view, 'qibla-dial-numeral-30', isRTL)).toBeGreaterThan(CENTRE);
      expect(physicalCentre(view, 'qibla-dial-numeral-330', isRTL)).toBeLessThan(CENTRE);
    });

    it.each(locales)('places every label with a translate and no left offset, in %s', async (locale) => {
      const view = await renderUi(<QiblaDial />, { locale });

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

  // A plain renderUi rerender would swap the root (its ThemeProvider), which remounts the face. The wrapper keeps the
  // provider in place so only the face's own memo decides whether it renders again.
  const themed = ({ children }: { children: ReactNode }) => <ThemeProvider name="light">{children}</ThemeProvider>;

  beforeAll(async () => {
    await i18n.changeLanguage('ar');
  });

  it('does not re-render when its parent re-renders (memoised, no props)', async () => {
    const view = await render(<QiblaDial />, { wrapper: themed });
    const afterMount = mockLabelRenders.mock.calls.length;

    await view.rerender(<QiblaDial />);

    expect(mockLabelRenders.mock.calls.length).toBe(afterMount);
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/salah/components/QiblaDial.tsx')).toEqual([]);
  });
});
