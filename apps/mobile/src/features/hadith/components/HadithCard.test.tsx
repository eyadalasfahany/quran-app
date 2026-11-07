import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { joinedChildrenText, PLACEHOLDER_TEXT, PLACEHOLDER_TEXT_LONG, physicalSides, testIdsInOrder } from '../../../../jest/hadith-ui-fixtures';
import { themes } from '@/core/theme';
import { maxFontScale } from '@/shared/ui';

import { HadithCard } from './HadithCard';

const TEST_ID = 'hadith-card';
const ITEM = { hadithNumber: '1234', textAr: PLACEHOLDER_TEXT };

describe('HadithCard', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderUi(<HadithCard item={ITEM} onPress={jest.fn()} />, { locale });
    expect(screen.getByText(PLACEHOLDER_TEXT)).toBeOnTheScreen();
    expect(screen.getByTestId(`${TEST_ID}-badge-number`, { includeHiddenElements: true })).toHaveTextContent(locale === 'ar' ? '١٢٣٤' : '1234');
  });

  it('shows the pill badge, the preview and no saved glyph by default', async () => {
    await renderUi(<HadithCard item={ITEM} onPress={jest.fn()} />);
    expect(screen.getByTestId(`${TEST_ID}-badge`, { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByTestId(`${TEST_ID}-text`)).toBeOnTheScreen();
    expect(screen.queryByTestId(`${TEST_ID}-saved`, { includeHiddenElements: true })).toBeNull();
  });

  it('shows the filled bookmark glyph when saved', async () => {
    await renderUi(<HadithCard item={ITEM} onPress={jest.fn()} saved />);
    expect(screen.getByTestId(`${TEST_ID}-saved`, { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('uses the selected fill when selected', async () => {
    await renderUi(<HadithCard item={ITEM} onPress={jest.fn()} selected />);
    expect(flatStyle(screen.getByRole('button').props.style).backgroundColor).toBe(themes.light.colors.glassSelected);
  });

  it('clamps to three lines by default and to the given lines', async () => {
    const first = await renderUi(<HadithCard item={{ hadithNumber: '1', textAr: PLACEHOLDER_TEXT_LONG }} onPress={jest.fn()} />);
    expect(screen.getByTestId(`${TEST_ID}-text`).props.numberOfLines).toBe(3);
    await first.unmount();

    await renderUi(<HadithCard item={{ hadithNumber: '1', textAr: PLACEHOLDER_TEXT_LONG }} numberOfLines={5} onPress={jest.fn()} />);
    expect(screen.getByTestId(`${TEST_ID}-text`).props.numberOfLines).toBe(5);
  });

  it('is one button labelled with the number and the text', async () => {
    await renderUi(<HadithCard item={ITEM} onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: `حديث رقم ١٢٣٤, ${PLACEHOLDER_TEXT}` })).toBeOnTheScreen();
  });

  it('has no border', async () => {
    await renderUi(<HadithCard item={ITEM} onPress={jest.fn()} />);
    expect(flatStyle(screen.getByRole('button').props.style).borderWidth).toBeUndefined();
  });

  it('shows a decimal number in a wider badge', async () => {
    await renderUi(<HadithCard item={{ hadithNumber: '2787.2', textAr: PLACEHOLDER_TEXT }} onPress={jest.fn()} />);
    expect(screen.getByTestId(`${TEST_ID}-badge-number`, { includeHiddenElements: true })).toHaveTextContent('٢٧٨٧٫٢');
    expect(flatStyle(screen.getByTestId(`${TEST_ID}-badge`, { includeHiddenElements: true }).props.style).minWidth).toBe(28);
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    await renderUi(<HadithCard item={ITEM} onPress={onPress} />);
    await press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('passes the chain through to the text', async () => {
    await renderUi(<HadithCard chainEnd={4} item={{ hadithNumber: '1', textAr: 'سند ثم متن' }} onPress={jest.fn()} />);
    expect(screen.getByTestId(`${TEST_ID}-text-chain`)).toHaveTextContent('سند');
    expect(joinedChildrenText(screen.getByTestId(`${TEST_ID}-text`).props.children)).toBe('سند ثم متن');
  });

  it('exposes its role, label and state', async () => {
    await renderUi(<HadithCard item={ITEM} onPress={jest.fn()} selected />);
    expect(screen.getByRole('button', { name: `حديث رقم ١٢٣٤, ${PLACEHOLDER_TEXT}`, selected: true })).toBeOnTheScreen();
  });

  it('places the badge at the start and the text after it', async () => {
    await renderUi(<HadithCard item={ITEM} onPress={jest.fn()} />);
    const order = testIdsInOrder(screen.toJSON(), TEST_ID);
    expect(order.indexOf(`${TEST_ID}-badge`)).toBeLessThan(order.indexOf(`${TEST_ID}-text`));
  });

  it('uses start and end, never left and right', async () => {
    await renderUi(<HadithCard item={ITEM} onPress={jest.fn()} />);
    expect(physicalSides(flatStyle(screen.getByRole('button').props.style))).toEqual([]);
  });

  it.each(['light', 'sepia', 'dark'] as const)('reads its colours from the theme (%s)', async (theme) => {
    await renderUi(<HadithCard item={ITEM} onPress={jest.fn()} />, { theme });
    expect(flatStyle(screen.getByRole('button').props.style).backgroundColor).toBe(themes[theme].colors.surfaceRaised);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithCard.tsx')).toEqual([]);
  });

  it('keeps text scalable and unclipped at the largest size', async () => {
    await renderUi(<HadithCard item={ITEM} onPress={jest.fn()} />);
    expect(screen.getByTestId(`${TEST_ID}-text`).props.maxFontSizeMultiplier).toBe(maxFontScale.content);
    expect(flatStyle(screen.getByRole('button').props.style)).not.toHaveProperty('height');
  });
});
