import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { joinedChildrenText, PLACEHOLDER_TEXT, PLACEHOLDER_TEXT_LONG, physicalSides, searchHitFixture, testIdsInOrder } from '../../../../jest/hadith-ui-fixtures';
import { themes } from '@/core/theme';
import { maxFontScale } from '@/shared/ui';

import { HadithSearchResultRow } from './HadithSearchResultRow';

const TEST_ID = 'hadith-search-result-row';
const BOOK = '[اسم الكتاب]';
const COLLECTION = '[اسم المجموعة]';

function renderRow(hit = searchHitFixture(), options: { locale?: 'ar' | 'en'; theme?: 'light' | 'sepia' | 'dark' } = {}) {
  const onPress = jest.fn();
  return { onPress, view: renderUi(<HadithSearchResultRow bookTitleText={BOOK} hit={hit} onPress={onPress} />, options) };
}

describe('HadithSearchResultRow', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    const { view } = renderRow(undefined, { locale });
    await view;
    expect(screen.getByTestId(`${TEST_ID}-text`)).toBeOnTheScreen();
  });

  it('shows the preview above the meta line', async () => {
    await renderRow().view;
    const order = testIdsInOrder(screen.toJSON(), TEST_ID);
    expect(order.indexOf(`${TEST_ID}-text`)).toBeLessThan(order.indexOf(`${TEST_ID}-meta`));
  });

  it('fills each range with highlightGold', async () => {
    await renderRow().view;
    const match = screen.getByText(PLACEHOLDER_TEXT.slice(4, 9));
    expect(flatStyle(match.props.style).backgroundColor).toBe(themes.light.colors.highlightGold);
  });

  it('joins the parts back into the exact original text', async () => {
    await renderRow().view;
    expect(joinedChildrenText(screen.getByTestId(`${TEST_ID}-text`).props.children)).toBe(PLACEHOLDER_TEXT);
  });

  it('skips ranges that overlap or fall outside the text', async () => {
    const hit = searchHitFixture({
      ranges: [
        { start: 4, end: 9 },
        { start: 6, end: 12 },
        { start: 500, end: 600 },
      ],
    });
    await renderRow(hit).view;
    expect(joinedChildrenText(screen.getByTestId(`${TEST_ID}-text`).props.children)).toBe(PLACEHOLDER_TEXT);
    expect(screen.getAllByText(PLACEHOLDER_TEXT.slice(4, 9))).toHaveLength(1);
  });

  it('labels the row meta first, then the text', async () => {
    await renderRow().view;
    expect(screen.getByRole('button', { name: `${COLLECTION}, ${BOOK}, ١٢٣٤, ${PLACEHOLDER_TEXT}` })).toBeOnTheScreen();
  });

  it('clamps to two lines', async () => {
    await renderRow(searchHitFixture({ item: { ...searchHitFixture().item, textAr: PLACEHOLDER_TEXT_LONG }, ranges: [] })).view;
    expect(screen.getByTestId(`${TEST_ID}-text`).props.numberOfLines).toBe(2);
  });

  it('has the hairline border', async () => {
    await renderRow().view;
    expect(flatStyle(screen.getByRole('button').props.style)).toMatchObject({ borderWidth: 1, borderColor: themes.light.colors.line });
  });

  it('calls onPress', async () => {
    const { onPress, view } = renderRow();
    await view;
    await press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('uses start and end, never left and right', async () => {
    await renderRow().view;
    expect(physicalSides(flatStyle(screen.getByRole('button').props.style))).toEqual([]);
    expect(physicalSides(flatStyle(screen.getByTestId(`${TEST_ID}-text`).props.style))).toEqual([]);
  });

  it('keeps the preview right to left, justified', async () => {
    await renderRow().view;
    expect(flatStyle(screen.getByTestId(`${TEST_ID}-text`).props.style)).toMatchObject({ textAlign: 'justify', writingDirection: 'rtl' });
  });

  it.each(['light', 'sepia', 'dark'] as const)('reads its colours from the theme (%s)', async (theme) => {
    await renderRow(undefined, { theme }).view;
    expect(flatStyle(screen.getByRole('button').props.style).backgroundColor).toBe(themes[theme].colors.surfaceRaised);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithSearchResultRow.tsx')).toEqual([]);
  });

  it('keeps text scalable and unclipped at the largest size', async () => {
    await renderRow().view;
    expect(screen.getByTestId(`${TEST_ID}-text`).props.maxFontSizeMultiplier).toBe(maxFontScale.content);
    expect(flatStyle(screen.getByRole('button').props.style)).not.toHaveProperty('height');
  });
});
