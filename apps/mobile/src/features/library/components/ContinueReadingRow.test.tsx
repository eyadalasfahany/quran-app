import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { themes } from '@/core/theme';
import type { ChapterRecord } from '@/features/reader/data/chapters';

import { ContinueReadingRow } from './ContinueReadingRow';

const chapter: ChapterRecord = {
  id: 2,
  nameArabic: 'البقرة',
  nameSimple: 'Al-Baqarah',
  nameEn: 'The Cow',
  revelationPlace: 'madinah',
  revelationOrder: 87,
  versesCount: 286,
  bismillahPre: 1,
  bismillahText: null,
  bismillahImlaei: null,
  pageStart: 2,
  pageEnd: 49,
};

describe('ContinueReadingRow', () => {
  it('renders the section title and continue row', async () => {
    const view = await renderUi(
      <ContinueReadingRow ayah={255} chapter={chapter} onPress={() => undefined} verseKey="2:255" />,
    );

    expect(view.getByText(/Continue reading|تابع القراءة/)).toBeOnTheScreen();
    expect(view.getByText('Al-Baqarah')).toBeOnTheScreen();
    expect(view.getByText(/2:255/)).toBeOnTheScreen();
  });

  it('draws the section title as an ink headline', async () => {
    const view = await renderUi(
      <ContinueReadingRow ayah={255} chapter={chapter} onPress={() => undefined} verseKey="2:255" />,
    );

    expect(flatStyle(view.getByText('تابع القراءة').props.style)).toMatchObject({
      ...themes.light.text.headline,
      color: themes.light.colors.ink,
    });
  });

  it('calls onPress when the row is pressed', async () => {
    const onPress = jest.fn();
    const view = await renderUi(
      <ContinueReadingRow ayah={255} chapter={chapter} onPress={onPress} verseKey="2:255" />,
    );

    await fireEvent.press(view.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('labels the row button with the surah and position', async () => {
    const view = await renderUi(
      <ContinueReadingRow ayah={255} chapter={chapter} onPress={() => undefined} verseKey="2:255" />,
    );

    expect(view.getByTestId('index-continue-reading').props.accessibilityLabel).toBe(
      'Al-Baqarah, البقرة · 2:255 · 255',
    );
  });

  it.each(locales)('renders under %s locale', async (locale) => {
    const view = await renderUi(
      <ContinueReadingRow ayah={255} chapter={chapter} onPress={() => undefined} verseKey="2:255" />,
      { locale },
    );

    expect(view.getByText(locale === 'ar' ? 'تابع القراءة' : 'Continue reading')).toBeOnTheScreen();
    expect(flatStyle(view.getByText('Al-Baqarah').props.style).fontFamily).toBeDefined();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/library/components/ContinueReadingRow.tsx')).toEqual([]);
  });
});
