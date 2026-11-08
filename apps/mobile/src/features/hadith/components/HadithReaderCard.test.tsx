import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { joinedChildrenText, PLACEHOLDER_CHAIN, PLACEHOLDER_TEXT_MARKS, physicalSides, testIdsInOrder } from '../../../../jest/hadith-ui-fixtures';
import { themes } from '@/core/theme';
import { maxFontScale } from '@/shared/ui';

import { HadithReaderCard } from './HadithReaderCard';

const TEST_ID = 'hadith-reader-card';

function renderCard(props: Partial<Parameters<typeof HadithReaderCard>[0]> = {}, locale: 'ar' | 'en' = 'ar') {
  return renderUi(
    <HadithReaderCard
      hadithNumber="1234"
      text={PLACEHOLDER_TEXT_MARKS}
      {...props}
    />,
    { locale },
  );
}

describe('HadithReaderCard', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderCard({}, locale);
    expect(screen.getByTestId(`${TEST_ID}-number`)).toHaveTextContent(locale === 'ar' ? 'حديث رقم ١٢٣٤' : 'Hadith 1234');
    expect(screen.getByText(PLACEHOLDER_TEXT_MARKS)).toBeOnTheScreen();
  });

  it('draws the number label before the text, with no source footnote', async () => {
    await renderCard();
    const order = testIdsInOrder(screen.toJSON(), TEST_ID);
    expect(order.indexOf(`${TEST_ID}-number`)).toBeLessThan(order.indexOf(`${TEST_ID}-text`));
    expect(screen.queryByTestId(`${TEST_ID}-source`)).toBeNull();
  });

  it('has radius 24, padding 22 and 20, and no border', async () => {
    await renderCard();
    expect(flatStyle(screen.getByTestId(TEST_ID).props.style)).toMatchObject({
      borderRadius: 24,
      paddingVertical: 22,
      paddingHorizontal: 20,
    });
    expect(flatStyle(screen.getByTestId(TEST_ID).props.style).borderWidth).toBeUndefined();
  });

  it('shows the number label at the start, not centred', async () => {
    await renderCard();
    expect(flatStyle(screen.getByTestId(`${TEST_ID}-number`).props.style).textAlign).not.toBe('center');
  });

  it('passes the chain through to the text', async () => {
    await renderCard({ chainEnd: 4, text: PLACEHOLDER_CHAIN });
    expect(screen.getByTestId(`${TEST_ID}-text-chain`)).toHaveTextContent(PLACEHOLDER_CHAIN.slice(0, 4));
    expect(joinedChildrenText(screen.getByTestId(`${TEST_ID}-text`).props.children)).toBe(PLACEHOLDER_CHAIN);
  });

  it('exposes its role, label and state', async () => {
    await renderCard();
    expect(screen.queryByText(/المصدر/)).toBeNull();
    expect(screen.getByTestId(`${TEST_ID}-text`).props.accessibilityLanguage).toBe('ar');
  });

  it('uses start and end, never left and right', async () => {
    await renderCard();
    expect(physicalSides(flatStyle(screen.getByTestId(TEST_ID).props.style))).toEqual([]);
  });

  it.each(['light', 'sepia', 'dark'] as const)('reads its colours from the theme (%s)', async (theme) => {
    await renderUi(<HadithReaderCard hadithNumber="1" text={PLACEHOLDER_TEXT_MARKS} />, { theme });
    expect(flatStyle(screen.getByTestId(TEST_ID).props.style).backgroundColor).toBe(themes[theme].colors.surfaceRaised);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithReaderCard.tsx')).toEqual([]);
  });

  it('keeps text scalable and unclipped at the largest size', async () => {
    await renderCard();
    expect(screen.getByTestId(`${TEST_ID}-number`).props.maxFontSizeMultiplier).toBe(maxFontScale.content);
    expect(flatStyle(screen.getByTestId(TEST_ID).props.style)).not.toHaveProperty('height');
  });


  it('shows the placeholder note in place of the text and no text node', async () => {
    await renderCard({ unavailable: true, hadithNumber: '1234', text: '' });
    expect(screen.getByTestId(`${TEST_ID}-unavailable`)).toHaveTextContent('الحديث ١٢٣٤ غير متوفر حاليًا في المصدر');
    expect(screen.queryByTestId(`${TEST_ID}-text`)).toBeNull();
  });

  it('shows the text when the row is not a placeholder', async () => {
    await renderCard({ unavailable: false });
    expect(screen.getByTestId(`${TEST_ID}-text`)).toBeOnTheScreen();
    expect(screen.queryByTestId(`${TEST_ID}-unavailable`)).toBeNull();
  });
});
