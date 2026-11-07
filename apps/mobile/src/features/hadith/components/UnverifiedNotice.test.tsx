import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { physicalSides } from '../../../../jest/hadith-ui-fixtures';
import { themes } from '@/core/theme';
import { maxFontScale } from '@/shared/ui';

import { UnverifiedNotice } from './UnverifiedNotice';

const TEST_ID = 'unverified-notice';
const TITLE = 'تغيّر مصدر الأحاديث';
const BODY = 'تُعرض بعض المحفوظات على مستوى الكتاب حتى نتحقق منها.';

describe('UnverifiedNotice', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderUi(<UnverifiedNotice />, { locale });
    expect(screen.getByTestId(`${TEST_ID}-title`)).toHaveTextContent(locale === 'ar' ? TITLE : 'The hadith source changed');
  });

  it('shows the title and the body', async () => {
    await renderUi(<UnverifiedNotice />);
    expect(screen.getByText(TITLE)).toBeOnTheScreen();
    expect(screen.getByText(BODY)).toBeOnTheScreen();
  });

  it('uses the fill-secondary fill and radius 16', async () => {
    await renderUi(<UnverifiedNotice />);
    expect(flatStyle(screen.getByTestId(TEST_ID).props.style)).toMatchObject({
      backgroundColor: themes.light.colors.fillSecondary,
      borderRadius: 16,
    });
  });

  it('is one summary element with a combined label', async () => {
    await renderUi(<UnverifiedNotice />);
    expect(screen.getByRole('summary', { name: `${TITLE}, ${BODY}` })).toBeOnTheScreen();
  });

  it('uses start and end, never left and right', async () => {
    await renderUi(<UnverifiedNotice />);
    expect(physicalSides(flatStyle(screen.getByTestId(TEST_ID).props.style))).toEqual([]);
  });

  it.each(['light', 'sepia', 'dark'] as const)('reads its colours from the theme (%s)', async (theme) => {
    await renderUi(<UnverifiedNotice />, { theme });
    expect(flatStyle(screen.getByTestId(TEST_ID).props.style).backgroundColor).toBe(themes[theme].colors.fillSecondary);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/UnverifiedNotice.tsx')).toEqual([]);
  });

  it('keeps text scalable and unclipped at the largest size', async () => {
    await renderUi(<UnverifiedNotice />);
    expect(screen.getByTestId(`${TEST_ID}-body`).props.maxFontSizeMultiplier).toBe(maxFontScale.content);
    expect(flatStyle(screen.getByTestId(TEST_ID).props.style)).not.toHaveProperty('height');
  });
});
