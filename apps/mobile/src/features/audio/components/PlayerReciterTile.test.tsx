import type { ComponentProps } from 'react';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import { PlayerReciterTile } from './PlayerReciterTile';

jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SymbolView: () => createElement(View, {} as ComponentProps<typeof View>) };
});

const colors = themes.dark.colors;

describe('PlayerReciterTile', () => {
  it.each(locales)('shows the letter on the glass fill, unselected, in %s', async (locale) => {
    const view = await renderUi(<PlayerReciterTile letter="ح" selected={false} testID="tile" />, {
      locale,
      theme: 'dark',
    });

    expect(flatStyle(view.getByTestId('tile', { includeHiddenElements: true }).props.style)).toMatchObject({
      backgroundColor: colors.playerGlassFill,
      borderRadius: 14,
      height: 46,
      width: 46,
    });
    expect(flatStyle(view.getByText('ح', { includeHiddenElements: true }).props.style).color).toBe(colors.playerAccent);
  });

  it('fills the tile with the brand surface when selected', async () => {
    const view = await renderUi(<PlayerReciterTile letter="ع" selected testID="tile" />, { theme: 'dark' });

    expect(flatStyle(view.getByTestId('tile', { includeHiddenElements: true }).props.style).backgroundColor).toBe(colors.brandSurface);
    expect(flatStyle(view.getByText('ع', { includeHiddenElements: true }).props.style).color).toBe(colors.playerAccent);
  });

  it('mutes the letter when dimmed', async () => {
    const view = await renderUi(<PlayerReciterTile dimmed letter="إ" selected={false} />, { theme: 'dark' });

    expect(flatStyle(view.getByText('إ', { includeHiddenElements: true }).props.style).color).toBe(colors.playerMuted);
  });

  it('is hidden from accessibility, because the row carries the name', async () => {
    const view = await renderUi(<PlayerReciterTile letter="ص" selected={false} testID="tile" />, { theme: 'dark' });

    expect(view.getByTestId('tile', { includeHiddenElements: true }).props.accessibilityElementsHidden).toBe(true);
    expect(view.queryByRole('button')).toBeNull();
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/PlayerReciterTile.tsx')).toEqual([]);
  });
});
