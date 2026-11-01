import type { ReactNode } from 'react';
import { render } from '@testing-library/react-native';

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

describe('QiblaDial', () => {
  beforeEach(() => {
    mockKaabaRenders.mockClear();
  });

  it('draws the cardinals and the eight degree numerals', async () => {
    const view = await renderUi(<QiblaDial bearing={244} />);

    for (const cardinal of ['ش', 'ج', 'غ', 'ق']) {
      expect(view.getByText(cardinal)).toBeOnTheScreen();
    }
    for (const numeral of ['٣٠', '٦٠', '١٢٠', '١٥٠', '٢١٠', '٢٤٠', '٣٠٠', '٣٣٠']) {
      expect(view.getByText(numeral)).toBeOnTheScreen();
    }
  });

  it.each(locales)('localizes cardinals and numerals in %s', async (locale) => {
    const view = await renderUi(<QiblaDial bearing={244} />, { locale });

    expect(view.getByText(locale === 'ar' ? '٣٠' : '30')).toBeOnTheScreen();
    expect(view.getByText(locale === 'ar' ? 'ش' : 'N')).toBeOnTheScreen();
  });

  it('parks the marker on the gold arc at the bearing', async () => {
    const view = await renderUi(<QiblaDial bearing={244} />);

    const marker = view.getByTestId('qibla-compass-marker');
    const rotate = (flatStyle(marker.props.style).transform as { rotate: string }[]).find((t) => 'rotate' in t);
    expect(rotate?.rotate).toBe('244deg');
  });

  // A plain renderUi rerender would swap the root (its ThemeProvider), which remounts the dial. The wrapper keeps the
  // provider in place so only the dial's own memo decides whether it renders again.
  const themed = ({ children }: { children: ReactNode }) => <ThemeProvider name="light">{children}</ThemeProvider>;

  beforeAll(async () => {
    await i18n.changeLanguage('ar');
  });

  it('does not re-render when re-rendered with the same bearing (memoised)', async () => {
    const view = await render(<QiblaDial bearing={244} />, { wrapper: themed });
    const afterMount = mockKaabaRenders.mock.calls.length;

    await view.rerender(<QiblaDial bearing={244} />);

    expect(mockKaabaRenders.mock.calls.length).toBe(afterMount);
  });

  it('re-renders when the bearing changes', async () => {
    const view = await render(<QiblaDial bearing={244} />, { wrapper: themed });
    const afterMount = mockKaabaRenders.mock.calls.length;

    await view.rerender(<QiblaDial bearing={100} />);

    expect(mockKaabaRenders.mock.calls.length).toBeGreaterThan(afterMount);
    const marker = view.getByTestId('qibla-compass-marker');
    const rotate = (flatStyle(marker.props.style).transform as { rotate: string }[]).find((t) => 'rotate' in t);
    expect(rotate?.rotate).toBe('100deg');
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/salah/components/QiblaDial.tsx')).toEqual([]);
  });
});
