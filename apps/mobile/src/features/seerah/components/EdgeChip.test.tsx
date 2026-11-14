import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { themes } from '@/core/theme';

import { EdgeChip } from './EdgeChip';

const base = { accessibilityLabel: 'Chip a11y', count: 7, label: 'الشام', onPress: jest.fn() };

const hidden = { includeHiddenElements: true } as const;

describe('EdgeChip', () => {
  it.each(locales)('shows the place and the count (%s)', async (locale) => {
    await renderUi(<EdgeChip {...base} direction="north" />, { locale });
    expect(screen.getByRole('button', { name: 'Chip a11y' })).toBeOnTheScreen();
    expect(screen.getByText('الشام')).toBeOnTheScreen();
    expect(screen.getByText(locale === 'ar' ? '٧' : '7', hidden)).toBeOnTheScreen();
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
    expect(flatStyle(screen.getByTestId('chip').props.style)).toMatchObject({
      borderColor: themes.light.colors.inkMuted,
      borderStyle: 'dashed',
    });
    await other.unmount();
    await renderUi(<EdgeChip {...base} direction="west" testID="chip" />);
    expect(flatStyle(screen.getByTestId('chip').props.style).borderStyle).toBe('solid');
  });

  it('is at least 44 pt tall', async () => {
    await renderUi(<EdgeChip {...base} direction="east" testID="chip" />);
    expect(flatStyle(screen.getByTestId('chip').props.style).minHeight).toBeGreaterThanOrEqual(44);
  });

  it('a dimmed chip leaves the accessibility order', async () => {
    await renderUi(<EdgeChip {...base} dimmed direction="north" />);
    expect(screen.queryByRole('button', { name: 'Chip a11y' })).toBeNull();
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/EdgeChip.tsx')).toEqual([]);
  });
});
