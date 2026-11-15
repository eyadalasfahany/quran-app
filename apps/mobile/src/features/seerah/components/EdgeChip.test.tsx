import { screen } from '@testing-library/react-native';
import { SymbolView } from 'expo-symbols';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { themes } from '@/core/theme';

import { EdgeChip } from './EdgeChip';

jest.mock('expo-symbols', () => {
  const actual = jest.requireActual<typeof import('expo-symbols')>('expo-symbols');
  return { ...actual, SymbolView: jest.fn(() => null) };
});

const ARROWS = { east: 'arrow.right', north: 'arrow.up', south: 'arrow.down', west: 'arrow.left' } as const;

const base = { accessibilityLabel: 'Chip a11y', count: 7, label: 'الشام', onPress: jest.fn() };

const hidden = { includeHiddenElements: true } as const;

describe('EdgeChip', () => {
  it.each(locales)('shows the place and the count (%s)', async (locale) => {
    await renderUi(<EdgeChip {...base} direction="north" />, { locale });
    expect(screen.getByRole('button', { name: 'Chip a11y' })).toBeOnTheScreen();
    expect(screen.getByText('الشام')).toBeOnTheScreen();
    expect(screen.getByText(locale === 'ar' ? '٧' : '7', hidden)).toBeOnTheScreen();
  });

  it.each(locales)('keeps the chip row in the app direction inside the physical overlay (%s)', async (locale) => {
    await renderUi(<EdgeChip {...base} direction="north" testID="chip" />, { locale });
    expect(flatStyle(screen.getByTestId('chip-surface').props.style)).toMatchObject({ direction: locale === 'ar' ? 'rtl' : 'ltr' });
  });

  it('calls onPress', async () => {
    const onPress = jest.fn();
    await renderUi(<EdgeChip {...base} direction="south" onPress={onPress} />);
    await press(screen.getByRole('button', { name: 'Chip a11y' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('passes the hint to screen readers', async () => {
    await renderUi(<EdgeChip {...base} accessibilityHint="Go there" direction="north" />);
    expect(screen.getByRole('button', { name: 'Chip a11y' }).props.accessibilityHint).toBe('Go there');
  });

  it('draws «أخرى» with a dashed edge, a region with a solid one', async () => {
    const other = await renderUi(<EdgeChip {...base} direction="other" testID="chip" />);
    expect(flatStyle(screen.getByTestId('chip-surface').props.style)).toMatchObject({
      borderColor: themes.light.colors.inkMuted,
      borderStyle: 'dashed',
    });
    await other.unmount();
    await renderUi(<EdgeChip {...base} direction="west" testID="chip" />);
    expect(flatStyle(screen.getByTestId('chip-surface').props.style).borderStyle).toBe('solid');
  });

  it('is 36 pt tall and reaches a 44 pt touch target with hit slop', async () => {
    await renderUi(<EdgeChip {...base} direction="east" testID="chip" />);
    const style = flatStyle(screen.getByTestId('chip-surface').props.style);
    expect(style.minHeight).toBe(36);
    expect(Number(style.minHeight) + 2 * Number(screen.getByTestId('chip').props.hitSlop)).toBe(44);
  });

  it.each(locales)('draws the frame order and sizes: arrow, name at 13/600, then an 18 pt brand count pill (%s)', async (locale) => {
    await renderUi(<EdgeChip {...base} direction="north" testID="chip" />, { locale });
    const surface = screen.getByTestId('chip-surface', hidden);
    const kids = (surface.children as { props: { testID?: string } }[])
      .map((child) => child.props.testID)
      .filter((id) => id !== 'chip-surface-glass');
    expect(kids[0]).toBe('chip-arrow');
    expect(kids[kids.length - 1]).toBe('chip-count');
    expect(flatStyle(screen.getByText('الشام').props.style)).toMatchObject({ fontSize: 13 });
    expect(flatStyle(screen.getByTestId('chip-count', hidden).props.style)).toMatchObject({
      backgroundColor: themes.light.colors.brand,
      height: 18,
      minWidth: 18,
    });
    // Physical padding in both languages, as the frames draw it.
    expect(flatStyle(surface.props.style)).toMatchObject({ gap: 6, paddingLeft: 10, paddingRight: 12 });
  });

  it('draws the map key sample as a 40 × 28 glyph chip with no name and no count', async () => {
    await renderUi(<EdgeChip {...base} direction="other" symbol testID="chip" />);
    expect(flatStyle(screen.getByTestId('chip').props.style)).toMatchObject({ borderStyle: 'dashed', height: 28, width: 40 });
    expect(screen.queryByText('الشام')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('a dimmed chip leaves the accessibility order', async () => {
    await renderUi(<EdgeChip {...base} dimmed direction="north" />);
    expect(screen.queryByRole('button', { name: 'Chip a11y' })).toBeNull();
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/EdgeChip.tsx')).toEqual([]);
  });

  it.each(locales)('the arrow points the way its group says and never mirrors (%s)', async (locale) => {
    for (const direction of ['north', 'south', 'west', 'east'] as const) {
      const view = await renderUi(<EdgeChip {...base} direction={direction} testID="chip" />, { locale });
      const calls = jest.mocked(SymbolView).mock.calls;
      expect(calls[calls.length - 1]?.[0]).toMatchObject({ name: { ios: ARROWS[direction] } });
      expect(flatStyle(screen.getByTestId('chip-arrow', hidden).props.style).transform).toBeUndefined();
      await view.unmount();
    }
  });
});
