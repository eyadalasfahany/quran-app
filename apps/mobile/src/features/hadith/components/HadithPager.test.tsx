import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { physicalSides, testIdsInOrder } from '../../../../jest/hadith-ui-fixtures';
import { themes, type Theme } from '@/core/theme';
import { maxFontScale } from '@/shared/ui';
import type { ThemeName } from '@quran/design-tokens';

import { HadithPager } from './HadithPager';

const TEST_ID = 'hadith-pager';

function renderPager(
  props: Partial<Parameters<typeof HadithPager>[0]> = {},
  options: { locale?: 'ar' | 'en'; theme?: ThemeName } = {},
) {
  return renderUi(
    <HadithPager hasNext hasPrevious onNext={jest.fn()} onPrevious={jest.fn()} position="1234" total={7563} {...props} />,
    options,
  );
}

describe('HadithPager', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderPager({}, { locale });
    expect(screen.getByRole('button', { name: locale === 'ar' ? 'السابق' : 'Previous' })).toBeOnTheScreen();
  });

  it('puts previous before next in the tree', async () => {
    await renderPager();
    const order = testIdsInOrder(screen.toJSON(), TEST_ID);
    expect(order.indexOf(`${TEST_ID}-previous`)).toBeLessThan(order.indexOf(`${TEST_ID}-position`));
    expect(order.indexOf(`${TEST_ID}-position`)).toBeLessThan(order.indexOf(`${TEST_ID}-next`));
  });

  it('shows «١٢٣٤ من ٧٥٦٣» in Arabic and "1234 of 7563" in English', async () => {
    const view = await renderPager({}, { locale: 'ar' });
    expect(screen.getByTestId(`${TEST_ID}-position`)).toHaveTextContent('١٢٣٤ من ٧٥٦٣');
    await view.unmount();

    await renderPager({}, { locale: 'en' });
    expect(screen.getByTestId(`${TEST_ID}-position`)).toHaveTextContent('1234 of 7563');
  });

  it('shows only the number when total is null', async () => {
    await renderPager({ total: null });
    expect(screen.getByTestId(`${TEST_ID}-position`)).toHaveTextContent('١٢٣٤');
    expect(screen.getByTestId(`${TEST_ID}-position`)).not.toHaveTextContent('من');
  });

  it('disables previous at the start and next at the end', async () => {
    const view = await renderPager({ hasPrevious: false, hasNext: true });
    expect(screen.getByRole('button', { name: 'السابق' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'التالي' })).toBeEnabled();
    await view.unmount();

    await renderPager({ hasPrevious: true, hasNext: false });
    expect(screen.getByRole('button', { name: 'التالي' })).toBeDisabled();
  });

  it('calls onPrevious and onNext', async () => {
    const onPrevious = jest.fn();
    const onNext = jest.fn();
    await renderPager({ onPrevious, onNext });
    await press(screen.getByRole('button', { name: 'السابق' }));
    await press(screen.getByRole('button', { name: 'التالي' }));
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('mirrors the chevrons in Arabic', async () => {
    await renderPager({}, { locale: 'ar' });
    expect(flatStyle(screen.getByTestId(`${TEST_ID}-previous-icon`, { includeHiddenElements: true }).props.style)).toMatchObject({
      transform: [{ scaleX: -1 }],
    });
  });

  it('uses start and end, never left and right', async () => {
    await renderPager();
    expect(physicalSides(flatStyle(screen.getByTestId(TEST_ID).props.style))).toEqual([]);
  });

  it('exposes its role, label and state', async () => {
    await renderPager();
    expect(screen.getByRole('text', { name: '١٢٣٤ من ٧٥٦٣' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'السابق' })).toBeEnabled();
  });

  it.each(['light', 'sepia', 'dark'] as const)('reads its colours from the theme (%s)', async (theme) => {
    await renderPager({}, { theme });
    const expected: Theme['colors'] = themes[theme].colors;
    expect(flatStyle(screen.getByTestId(`${TEST_ID}-position`).props.style).color).toBe(expected.inkMuted);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithPager.tsx')).toEqual([]);
  });

  it('keeps text scalable and unclipped at the largest size', async () => {
    await renderPager();
    expect(screen.getByTestId(`${TEST_ID}-position`).props.maxFontSizeMultiplier).toBe(maxFontScale.content);
  });
});
