import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { themes } from '@/core/theme';

import { UnspecifiedChip } from './UnspecifiedChip';

const base = { accessibilityLabel: 'Not stated, 12', count: 12, label: 'Not stated', onPress: jest.fn(), selected: false };
const hidden = { includeHiddenElements: true } as const;

describe('UnspecifiedChip', () => {
  it.each(locales)('shows the count and the label (%s)', async (locale) => {
    await renderUi(<UnspecifiedChip {...base} />, { locale });
    expect(screen.getByText(locale === 'ar' ? '١٢' : '12')).toBeOnTheScreen();
    expect(screen.getByText('Not stated')).toBeOnTheScreen();
  });

  it('is a button that reports its selected state and calls onPress', async () => {
    const onPress = jest.fn();
    await renderUi(<UnspecifiedChip {...base} onPress={onPress} selected />);
    const button = screen.getByRole('button', { name: 'Not stated, 12' });
    expect(button.props.accessibilityState).toEqual({ selected: true });
    await press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('draws a dashed box, brand when selected', async () => {
    const idle = await renderUi(<UnspecifiedChip {...base} testID="chip" />);
    expect(flatStyle(screen.getByTestId('chip-box').props.style)).toMatchObject({ borderStyle: 'dashed', borderColor: themes.light.colors.line });
    await idle.unmount();
    await renderUi(<UnspecifiedChip {...base} selected testID="chip" />);
    expect(flatStyle(screen.getByTestId('chip-box').props.style)).toMatchObject({ borderStyle: 'dashed', borderColor: themes.light.colors.brand });
  });

  it('is at least 44 pt', async () => {
    await renderUi(<UnspecifiedChip {...base} testID="chip" />);
    const style = flatStyle(screen.getByTestId('chip').props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
    expect(style.minWidth).toBeGreaterThanOrEqual(44);
    expect(hidden.includeHiddenElements).toBe(true);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/UnspecifiedChip.tsx')).toEqual([]);
  });
});
