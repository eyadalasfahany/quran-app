import { fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { PLACEHOLDER_TEXT, physicalSides } from '../../../../jest/hadith-ui-fixtures';
import { themes } from '@/core/theme';
import { maxFontScale } from '@/shared/ui';

import { HadithSourceLine } from './HadithSourceLine';

const TEST_ID = 'hadith-source-line';
const ATTRIBUTION = '[سطر النسبة من المصدر]';
const URL = 'https://example.invalid/source';

describe('HadithSourceLine', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderUi(<HadithSourceLine attribution={null} sourceUrl={null} />, { locale });
    expect(screen.getByText(locale === 'ar' ? 'المصدر: fawazahmed0/hadith-api' : 'Source: fawazahmed0/hadith-api')).toBeOnTheScreen();
  });

  it('shows the credit without a link when sourceUrl is null', async () => {
    await renderUi(<HadithSourceLine attribution={null} sourceUrl={null} />);
    expect(screen.getByText('المصدر: fawazahmed0/hadith-api')).toBeOnTheScreen();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('shows the credit as a link role when sourceUrl is set and opens it', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderUi(<HadithSourceLine attribution={null} sourceUrl={URL} />);
    fireEvent.press(screen.getByRole('link', { name: 'فتح المصدر' }));
    expect(open).toHaveBeenCalledWith(URL);
    open.mockRestore();
  });

  it('shows the attribution under the credit for a row with its own credit', async () => {
    await renderUi(<HadithSourceLine attribution={ATTRIBUTION} sourceCode="openiti" sourceUrl={null} />, { locale: 'en' });
    expect(screen.getByTestId(`${TEST_ID}-attribution`)).toHaveTextContent(ATTRIBUTION);
    expect(screen.getByText('Chapter titles and some hadith texts: OpenITI (release 2023.1.8), CC BY-NC-SA 4.0')).toBeOnTheScreen();
  });

  it.each([null, 'fawazahmed0'])('draws the attribution alone for source code %p, not the repeated credit', async (sourceCode) => {
    await renderUi(<HadithSourceLine attribution={ATTRIBUTION} sourceCode={sourceCode} sourceUrl={null} />, { locale: 'en' });
    expect(screen.getByTestId(`${TEST_ID}-attribution`)).toHaveTextContent(ATTRIBUTION);
    expect(screen.queryByText('Source: fawazahmed0/hadith-api')).toBeNull();
    expect(screen.queryByTestId(`${TEST_ID}-credit`)).toBeNull();
  });

  it('keeps the link on the attribution alone when a source URL is set', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderUi(<HadithSourceLine attribution={ATTRIBUTION} sourceCode="fawazahmed0" sourceUrl={URL} />);
    fireEvent.press(screen.getByRole('link', { name: 'فتح المصدر' }));
    expect(open).toHaveBeenCalledWith(URL);
    expect(screen.getByTestId(`${TEST_ID}-attribution`)).toHaveTextContent(ATTRIBUTION);
    open.mockRestore();
  });

  it('draws the attribution alone for a placeholder row', async () => {
    await renderUi(<HadithSourceLine attribution={ATTRIBUTION} sourceCode="unavailable" sourceUrl={null} />);
    expect(screen.getByTestId(`${TEST_ID}-attribution`)).toHaveTextContent(ATTRIBUTION);
    expect(screen.queryByText('المصدر: fawazahmed0/hadith-api')).toBeNull();
  });

  it.each([null, 'fawazahmed0', 'unavailable'])('draws the credit when the attribution is empty for source code %p', async (sourceCode) => {
    await renderUi(<HadithSourceLine attribution="" sourceCode={sourceCode} sourceUrl={null} />, { locale: 'en' });
    expect(screen.getByText('Source: fawazahmed0/hadith-api')).toBeOnTheScreen();
    expect(screen.queryByTestId(`${TEST_ID}-attribution`)).toBeNull();
  });

  it('draws no attribution when null or empty', async () => {
    const view = await renderUi(<HadithSourceLine attribution={null} sourceUrl={null} />);
    expect(screen.queryByTestId(`${TEST_ID}-attribution`)).toBeNull();
    await view.unmount();
    await renderUi(<HadithSourceLine attribution="" sourceUrl={null} />);
    expect(screen.queryByTestId(`${TEST_ID}-attribution`)).toBeNull();
  });

  it('centres both lines for align center', async () => {
    await renderUi(<HadithSourceLine align="center" attribution={ATTRIBUTION} sourceCode="openiti" sourceUrl={null} />);
    expect(flatStyle(screen.getByTestId(TEST_ID).props.style).alignItems).toBe('center');
    expect(flatStyle(screen.getByTestId(`${TEST_ID}-attribution`).props.style).textAlign).toBe('center');
  });

  it('centres the single attribution line for align center', async () => {
    await renderUi(<HadithSourceLine align="center" attribution={ATTRIBUTION} sourceUrl={null} />);
    expect(flatStyle(screen.getByTestId(TEST_ID).props.style).alignItems).toBe('center');
    expect(flatStyle(screen.getByTestId(`${TEST_ID}-attribution`).props.style).textAlign).toBe('center');
  });

  it('keeps the attribution right to left in English', async () => {
    await renderUi(<HadithSourceLine attribution={PLACEHOLDER_TEXT} sourceUrl={null} />, { locale: 'en' });
    expect(flatStyle(screen.getByTestId(`${TEST_ID}-attribution`).props.style)).toMatchObject({
      textAlign: 'right',
      writingDirection: 'rtl',
    });
  });

  it('uses start and end, never left and right', async () => {
    await renderUi(<HadithSourceLine attribution={ATTRIBUTION} sourceUrl={null} />);
    expect(physicalSides(flatStyle(screen.getByTestId(TEST_ID).props.style))).toEqual([]);
    expect(physicalSides(flatStyle(screen.getByTestId(`${TEST_ID}-attribution`).props.style))).toEqual([]);
  });

  it('exposes its role, label and state', async () => {
    await renderUi(<HadithSourceLine attribution={null} sourceUrl={URL} />);
    expect(screen.getByRole('link', { name: 'فتح المصدر' })).toBeOnTheScreen();
  });

  it.each(['light', 'sepia', 'dark'] as const)('reads its colours from the theme (%s)', async (theme) => {
    await renderUi(<HadithSourceLine attribution={ATTRIBUTION} sourceCode="openiti" sourceUrl={URL} />, { theme });
    expect(flatStyle(screen.getByTestId(`${TEST_ID}-attribution`).props.style).color).toBe(themes[theme].colors.inkMuted);
    expect(flatStyle(screen.getByTestId(`${TEST_ID}-link`).props.style)).toBeDefined();
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithSourceLine.tsx')).toEqual([]);
  });

  it('keeps text scalable and unclipped at the largest size', async () => {
    await renderUi(<HadithSourceLine attribution={null} sourceUrl={null} />);
    expect(screen.getByTestId(`${TEST_ID}-credit`).props.maxFontSizeMultiplier).toBe(maxFontScale.content);
    expect(flatStyle(screen.getByTestId(TEST_ID).props.style)).not.toHaveProperty('height');
  });


  it.each([
    ['openiti', 'Chapter titles and some hadith texts: OpenITI (release 2023.1.8), CC BY-NC-SA 4.0'],
    ['hadithapicom', 'Some hadith texts: hadithapi.com'],
  ])('shows the credit of the row source %s in English', async (sourceCode, credit) => {
    await renderUi(<HadithSourceLine attribution={null} sourceCode={sourceCode} sourceUrl={null} />, { locale: 'en' });
    expect(screen.getByText(credit)).toBeOnTheScreen();
    expect(screen.queryByText('Source: fawazahmed0/hadith-api')).toBeNull();
  });

  it.each([null, 'fawazahmed0'])('keeps the collection credit for source code %p when there is no attribution', async (sourceCode) => {
    await renderUi(<HadithSourceLine attribution={null} sourceCode={sourceCode} sourceUrl={null} />, { locale: 'en' });
    expect(screen.getByText('Source: fawazahmed0/hadith-api')).toBeOnTheScreen();
  });
});
