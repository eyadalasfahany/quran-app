import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { physicalSides } from '../../../../jest/hadith-ui-fixtures';
import { themes } from '@/core/theme';
import { maxFontScale } from '@/shared/ui';

import { HadithDetailsPanel } from './HadithDetailsPanel';

const TEST_ID = 'hadith-details-panel';
const COLLECTION = '[اسم المجموعة]';
const BOOK = '[اسم الكتاب]';
const ATTRIBUTION = '[سطر النسبة من المصدر]';

function renderPanel(options: { locale?: 'ar' | 'en'; theme?: 'light' | 'sepia' | 'dark' } = {}) {
  return renderUi(
    <HadithDetailsPanel
      attribution={ATTRIBUTION}
      bookTitle={BOOK}
      collectionTitle={COLLECTION}
      hadithNumber="2787.2"
      sourceUrl={null}
    />,
    options,
  );
}

describe('HadithDetailsPanel', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderPanel({ locale });
    expect(screen.getByTestId(`${TEST_ID}-title`)).toHaveTextContent(locale === 'ar' ? 'المصدر والتفاصيل' : 'Source and details');
  });

  it('shows the title and four labelled rows in order', async () => {
    await renderPanel();
    expect(screen.getByRole('header', { name: 'المصدر والتفاصيل' })).toBeOnTheScreen();
    expect(screen.getByTestId(`${TEST_ID}-label-collection`)).toHaveTextContent('المجموعة');
    expect(screen.getByTestId(`${TEST_ID}-label-book`)).toHaveTextContent('الكتاب');
    expect(screen.getByTestId(`${TEST_ID}-label-number`)).toHaveTextContent('رقم الحديث');
    expect(screen.getByTestId(`${TEST_ID}-label-source`)).toHaveTextContent('المصدر');
  });

  it('shows no grade row', async () => {
    await renderPanel();
    expect(screen.queryByText(/درجة/)).toBeNull();
    expect(screen.queryByTestId(`${TEST_ID}-row-grade`)).toBeNull();
  });

  it('formats the number', async () => {
    await renderPanel();
    expect(screen.getByTestId(`${TEST_ID}-value-number`)).toHaveTextContent('٢٧٨٧٫٢');
  });

  it('shows the credit and attribution', async () => {
    await renderPanel();
    expect(screen.getByText('المصدر: fawazahmed0/hadith-api')).toBeOnTheScreen();
    expect(screen.getByText(ATTRIBUTION)).toBeOnTheScreen();
  });

  it('has radius 28 and a hairline border', async () => {
    await renderPanel();
    expect(flatStyle(screen.getByTestId(TEST_ID).props.style)).toMatchObject({ borderRadius: 28, borderWidth: 1 });
  });

  it('uses start and end, never left and right', async () => {
    await renderPanel();
    expect(physicalSides(flatStyle(screen.getByTestId(TEST_ID).props.style))).toEqual([]);
  });

  it.each(['light', 'sepia', 'dark'] as const)('reads its colours from the theme (%s)', async (theme) => {
    await renderPanel({ theme });
    expect(flatStyle(screen.getByTestId(TEST_ID).props.style).backgroundColor).toBe(themes[theme].colors.surfaceRaised);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithDetailsPanel.tsx')).toEqual([]);
  });

  it('keeps text scalable and unclipped at the largest size', async () => {
    await renderPanel();
    expect(screen.getByTestId(`${TEST_ID}-title`).props.maxFontSizeMultiplier).toBe(maxFontScale.content);
    expect(flatStyle(screen.getByTestId(TEST_ID).props.style)).not.toHaveProperty('height');
  });
});
