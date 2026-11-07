import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { physicalSides } from '../../../../jest/hadith-ui-fixtures';
import { themes } from '@/core/theme';
import { maxFontScale } from '@/shared/ui';

import { BookRow } from './BookRow';

const TEST_ID = 'book-row';
const TITLE = '[اسم الكتاب]';
const BOOK = { bookNumber: '1', titleAr: TITLE, titleEn: '[Book name]', hadithCount: 123 };

function renderRow(
  props: Partial<Parameters<typeof BookRow>[0]> = {},
  options: { locale?: 'ar' | 'en'; theme?: 'light' | 'sepia' | 'dark' } = {},
) {
  const onPress = jest.fn();
  return { onPress, view: renderUi(<BookRow book={BOOK} onPress={onPress} {...props} />, options) };
}

describe('BookRow', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    const { view } = renderRow({}, { locale });
    await view;
    expect(screen.getByTestId(`${TEST_ID}-title`)).toHaveTextContent(locale === 'ar' ? TITLE : '[Book name]');
  });

  it('shows the circle badge, title, count and chevron', async () => {
    await renderRow().view;
    expect(screen.getByTestId(`${TEST_ID}-badge-number`, { includeHiddenElements: true })).toHaveTextContent('١');
    expect(screen.getByTestId(`${TEST_ID}-title`)).toHaveTextContent(TITLE);
    expect(screen.getByTestId(`${TEST_ID}-count`)).toHaveTextContent('١٢٣ حديثًا');
    expect(screen.getByTestId(`${TEST_ID}-chevron`, { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('shows «كتاب n» when untitled', async () => {
    await renderRow({ book: { ...BOOK, titleAr: null } }).view;
    expect(screen.getByTestId(`${TEST_ID}-title`)).toHaveTextContent('كتاب ١');
  });

  it('uses the selected fill when selected', async () => {
    await renderRow({ selected: true }).view;
    expect(flatStyle(screen.getByRole('button').props.style).backgroundColor).toBe(themes.light.colors.glassSelected);
  });

  it('compact: 52 high, 17 point title, 12 point count, no chevron', async () => {
    await renderRow({ compact: true }).view;
    expect(flatStyle(screen.getByRole('button').props.style).minHeight).toBe(52);
    expect(flatStyle(screen.getByTestId(`${TEST_ID}-title`).props.style).fontSize).toBe(17);
    expect(flatStyle(screen.getByTestId(`${TEST_ID}-count`).props.style).fontSize).toBe(12);
    expect(screen.queryByTestId(`${TEST_ID}-chevron`, { includeHiddenElements: true })).toBeNull();
  });

  it('reports selected state', async () => {
    await renderRow({ selected: true }).view;
    expect(screen.getByRole('button', { name: `${TITLE}, ١٢٣ حديثًا`, selected: true })).toBeOnTheScreen();
  });

  it('calls onPress when pressed', async () => {
    const { onPress, view } = renderRow();
    await view;
    await press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('has no border', async () => {
    await renderRow().view;
    expect(flatStyle(screen.getByRole('button').props.style).borderWidth).toBeUndefined();
  });

  it('uses start and end, never left and right', async () => {
    await renderRow().view;
    expect(physicalSides(flatStyle(screen.getByRole('button').props.style))).toEqual([]);
  });

  it.each(['light', 'sepia', 'dark'] as const)('reads its colours from the theme (%s)', async (theme) => {
    await renderRow({}, { theme }).view;
    expect(flatStyle(screen.getByRole('button').props.style).backgroundColor).toBe(themes[theme].colors.surfaceRaised);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/BookRow.tsx')).toEqual([]);
  });

  it('keeps text scalable and unclipped at the largest size', async () => {
    await renderRow().view;
    expect(screen.getByTestId(`${TEST_ID}-title`).props.maxFontSizeMultiplier).toBe(maxFontScale.content);
    expect(flatStyle(screen.getByRole('button').props.style)).not.toHaveProperty('height');
  });
});
