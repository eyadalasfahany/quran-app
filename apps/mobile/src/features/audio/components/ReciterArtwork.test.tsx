import type { ComponentProps } from 'react';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import { ReciterArtwork } from './ReciterArtwork';

jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SymbolView: () => createElement(View, {} as ComponentProps<typeof View>) };
});

const colors = themes.dark.colors;

describe('ReciterArtwork', () => {
  it('renders a 220 pt brand tile with the reciter letter in Amiri, accent colour', async () => {
    const view = await renderUi(<ReciterArtwork letter="م" />, { theme: 'dark' });
    const tile = flatStyle(view.getByTestId('reciter-artwork', { includeHiddenElements: true }).props.style);
    const letter = view.getByText('م', { includeHiddenElements: true });

    expect(tile).toMatchObject({ backgroundColor: colors.brandSurface, height: 220, width: 220, overflow: 'hidden' });
    expect(tile.borderRadius).toBe(32);
    expect(flatStyle(letter.props.style)).toMatchObject({
      color: colors.playerAccent,
      fontFamily: 'Amiri-Bold',
      fontSize: 96,
    });
  });

  it('scales the tile, corner and letter with its size', async () => {
    const view = await renderUi(<ReciterArtwork letter="م" size={110} />, { theme: 'dark' });
    const tile = flatStyle(view.getByTestId('reciter-artwork', { includeHiddenElements: true }).props.style);
    const letter = view.getByText('م', { includeHiddenElements: true });

    expect(tile).toMatchObject({ height: 110, width: 110 });
    expect(tile.borderRadius).toBeCloseTo(16, 5);
    expect(flatStyle(letter.props.style).fontSize).toBeCloseTo(48, 5);
  });

  it.each(locales)('is decorative and hidden from screen readers (%s)', async (locale) => {
    const view = await renderUi(<ReciterArtwork letter="ع" />, { locale });
    const tile = view.getByTestId('reciter-artwork', { includeHiddenElements: true });

    expect(tile.props.accessibilityElementsHidden).toBe(true);
    expect(tile.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/ReciterArtwork.tsx')).toEqual([]);
  });
});
