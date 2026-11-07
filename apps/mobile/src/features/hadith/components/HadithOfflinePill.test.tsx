import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { physicalSides } from '../../../../jest/hadith-ui-fixtures';
import { themes } from '@/core/theme';
import { maxFontScale } from '@/shared/ui';

import { HadithOfflinePill } from './HadithOfflinePill';

const TEST_ID = 'hadith-offline-pill';

describe('HadithOfflinePill', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderUi(<HadithOfflinePill />, { locale });
    expect(screen.getByText(locale === 'ar' ? 'غير متاح دون اتصال' : 'Unavailable offline')).toBeOnTheScreen();
  });

  it('shows the unavailable-offline text with the wifi glyph', async () => {
    await renderUi(<HadithOfflinePill />);
    expect(screen.getByTestId(TEST_ID)).toHaveTextContent('غير متاح دون اتصال');
    expect(screen.getByTestId(`${TEST_ID}-icon`, { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('is text, not a button', async () => {
    await renderUi(<HadithOfflinePill />);
    expect(screen.getByRole('text', { name: 'غير متاح دون اتصال' })).toBeOnTheScreen();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('uses the muted fill', async () => {
    await renderUi(<HadithOfflinePill />);
    expect(flatStyle(screen.getByTestId(TEST_ID).props.style).backgroundColor).toBe(themes.light.colors.fillSecondary);
  });

  it('uses start and end, never left and right', async () => {
    await renderUi(<HadithOfflinePill />);
    expect(physicalSides(flatStyle(screen.getByTestId(TEST_ID).props.style))).toEqual([]);
  });

  it.each(['light', 'sepia', 'dark'] as const)('reads its colours from the theme (%s)', async (theme) => {
    await renderUi(<HadithOfflinePill />, { theme });
    expect(flatStyle(screen.getByTestId(TEST_ID).props.style).backgroundColor).toBe(themes[theme].colors.fillSecondary);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithOfflinePill.tsx')).toEqual([]);
  });

  it('keeps text scalable and unclipped at the largest size', async () => {
    await renderUi(<HadithOfflinePill />);
    expect(screen.getByTestId(`${TEST_ID}-text`).props.maxFontSizeMultiplier).toBe(maxFontScale.content);
    expect(flatStyle(screen.getByTestId(TEST_ID).props.style)).not.toHaveProperty('height');
  });
});
