import { screen } from '@testing-library/react-native';

import { themes } from '@/core/theme';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { PLACEHOLDER_TEXT_MARKS, physicalSides, testIdsInOrder } from '../../../../jest/hadith-ui-fixtures';

import { HadithExplanationCard, type HadithExplanationView } from './HadithExplanationCard';

const TEST_ID = 'hadith-explanation-card';
const SOURCE = '[اسم المصدر]';
const INTRO = '[مقدمة الحديث كما وردت]';
const BENEFITS = ['[فائدة الأولى]', '[فائدة الثانية]'];
const FIRST_WORD = { word: '[الكلمة الأولى]', meaning: '[معناها الأول]' };
const SECOND_WORD = { word: '[الكلمة الثانية]', meaning: '[معناها الثاني]' };
const WORDS = [FIRST_WORD, SECOND_WORD];

const FULL: HadithExplanationView = {
  sourceName: SOURCE,
  explanation: PLACEHOLDER_TEXT_MARKS,
  intro: INTRO,
  benefits: BENEFITS,
  wordMeanings: WORDS,
};

function renderCard(props: Partial<HadithExplanationView> = {}, locale: 'ar' | 'en' = 'ar') {
  return renderUi(<HadithExplanationCard explanation={PLACEHOLDER_TEXT_MARKS} sourceName={SOURCE} {...props} />, {
    locale,
  });
}

describe('HadithExplanationCard', () => {
  it('renders every field when all are given', async () => {
    await renderUi(<HadithExplanationCard {...FULL} />);
    expect(screen.getByText('الشرح')).toBeOnTheScreen();
    expect(screen.getByTestId(`${TEST_ID}-source`)).toHaveTextContent(SOURCE);
    expect(screen.getByTestId(`${TEST_ID}-intro`)).toHaveTextContent(INTRO);
    expect(screen.getByTestId(`${TEST_ID}-body`)).toHaveTextContent(PLACEHOLDER_TEXT_MARKS);
    expect(screen.getByText('الفوائد')).toBeOnTheScreen();
    expect(screen.getByText('[فائدة الأولى]')).toBeOnTheScreen();
    expect(screen.getByText('[فائدة الثانية]')).toBeOnTheScreen();
    expect(screen.getByText('معاني الكلمات')).toBeOnTheScreen();
    expect(screen.getByTestId(`${TEST_ID}-word-0`)).toHaveTextContent(`${FIRST_WORD.word}: ${FIRST_WORD.meaning}`);
    expect(screen.getByTestId(`${TEST_ID}-word-1`)).toHaveTextContent(`${SECOND_WORD.word}: ${SECOND_WORD.meaning}`);
  });

  it('renders the explanation text exactly as given', async () => {
    const text = '  [نص بمسافات]  \n[سطر ثان]  ';
    await renderCard({ explanation: text });
    expect(screen.getByTestId(`${TEST_ID}-body`).props.children).toBe(text);
  });

  it.each(locales)('shows the English labels only in English (%s)', async (locale) => {
    await renderUi(<HadithExplanationCard {...FULL} />, { locale });
    expect(screen.getByRole('header', { name: locale === 'ar' ? 'الشرح' : 'Explanation' })).toBeOnTheScreen();
    expect(screen.getByText(locale === 'ar' ? 'الفوائد' : 'Benefits')).toBeOnTheScreen();
    expect(screen.getByText(locale === 'ar' ? 'معاني الكلمات' : 'Word meanings')).toBeOnTheScreen();
  });

  it('hides the intro, benefits and word meanings when they are null', async () => {
    await renderCard({ intro: null, benefits: null, wordMeanings: null });
    expect(screen.queryByTestId(`${TEST_ID}-intro`)).toBeNull();
    expect(screen.queryByTestId(`${TEST_ID}-benefits`)).toBeNull();
    expect(screen.queryByTestId(`${TEST_ID}-words`)).toBeNull();
    expect(screen.queryByText('الفوائد')).toBeNull();
    expect(screen.queryByText('معاني الكلمات')).toBeNull();
  });

  it('hides the optional sections when they are empty', async () => {
    await renderCard({ intro: '', benefits: [], wordMeanings: [] });
    expect(screen.queryByTestId(`${TEST_ID}-intro`)).toBeNull();
    expect(screen.queryByTestId(`${TEST_ID}-benefits`)).toBeNull();
    expect(screen.queryByTestId(`${TEST_ID}-words`)).toBeNull();
    expect(screen.getByTestId(`${TEST_ID}-body`)).toBeOnTheScreen();
  });

  it('draws the sections in reading order: title, source, intro, body, benefits, word meanings', async () => {
    await renderUi(<HadithExplanationCard {...FULL} />);
    const order = testIdsInOrder(screen.toJSON(), TEST_ID);
    const at = (id: string) => order.indexOf(id);
    expect(at(`${TEST_ID}-title`)).toBeLessThan(at(`${TEST_ID}-source`));
    expect(at(`${TEST_ID}-source`)).toBeLessThan(at(`${TEST_ID}-intro`));
    expect(at(`${TEST_ID}-intro`)).toBeLessThan(at(`${TEST_ID}-body`));
    expect(at(`${TEST_ID}-body`)).toBeLessThan(at(`${TEST_ID}-benefits`));
    expect(at(`${TEST_ID}-benefits`)).toBeLessThan(at(`${TEST_ID}-words`));
  });

  it('uses the UI font, IBM Plex Sans Arabic, for the body and never Amiri', async () => {
    await renderUi(<HadithExplanationCard {...FULL} />);
    const family = flatStyle(screen.getByTestId(`${TEST_ID}-body`).props.style).fontFamily;
    expect(family).toBe('IBMPlexSansArabic-Regular');
    expect(String(family)).not.toMatch(/Amiri/);
    expect(String(flatStyle(screen.getByTestId(`${TEST_ID}-intro`).props.style).fontFamily)).not.toMatch(/Amiri/);
  });

  it.each(locales)('keeps the body RTL and justified in %s', async (locale) => {
    await renderCard({}, locale);
    const style = flatStyle(screen.getByTestId(`${TEST_ID}-body`).props.style);
    expect(style.writingDirection).toBe('rtl');
    expect(style.textAlign).toBe('justify');
    expect(style.fontSize).toBe(17);
    expect(style.lineHeight).toBeCloseTo(17 * 1.8, 5);
  });

  it('uses start and end, never left and right', async () => {
    await renderUi(<HadithExplanationCard {...FULL} />);
    expect(physicalSides(flatStyle(screen.getByTestId(TEST_ID).props.style))).toEqual([]);
  });

  it.each(['light', 'sepia', 'dark'] as const)('reads its colours from the theme (%s)', async (theme) => {
    await renderUi(<HadithExplanationCard {...FULL} />, { theme });
    expect(flatStyle(screen.getByTestId(TEST_ID).props.style).backgroundColor).toBe(themes[theme].colors.surfaceRaised);
  });

  it('has radius 24, padding 22 and 20, and no border', async () => {
    await renderCard();
    const style = flatStyle(screen.getByTestId(TEST_ID).props.style);
    expect(style).toMatchObject({ borderRadius: 24, paddingVertical: 22, paddingHorizontal: 20 });
    expect(style.borderWidth).toBeUndefined();
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithExplanationCard.tsx')).toEqual([]);
  });

  it('exposes the header role, the list role for benefits, and the header role for each sub-heading', async () => {
    await renderUi(<HadithExplanationCard {...FULL} />);
    expect(screen.getByRole('header', { name: 'الشرح' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'الفوائد' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'معاني الكلمات' })).toBeOnTheScreen();
    // RNTL's getByRole only finds accessible elements, so read the list role off the item's parent.
    expect(screen.getByTestId(`${TEST_ID}-benefit-0`).parent?.props.accessibilityRole).toBe('list');
  });

  it('hides the bullet from assistive tech', async () => {
    await renderUi(<HadithExplanationCard {...FULL} />);
    const bullets = screen.getAllByText('•');
    expect(bullets).toHaveLength(BENEFITS.length);
    bullets.forEach((bullet) => expect(bullet.props.accessible).toBe(false));
  });
});
