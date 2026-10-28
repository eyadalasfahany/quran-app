import { highContrast } from '@quran/design-tokens';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import type { ChapterRecord } from '@/features/reader/data/chapters';

import { SurahRow } from './SurahRow';

const hidden = { includeHiddenElements: true } as const;

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

describe('SurahRow', () => {
  it('shows the Arabic name only, never the transliteration (Surah index frame)', async () => {
    const view = await renderUi(<SurahRow chapter={chapter} onPress={() => undefined} />);

    expect(view.getByText('البقرة')).toBeOnTheScreen();
    expect(view.queryByText('Al-Baqarah')).toBeNull();
    expect(flatStyle(view.getByText('البقرة').props.style)).toMatchObject({
      fontFamily: 'Amiri-Bold',
      fontSize: 19,
      lineHeight: 33,
    });
  });

  it('draws the index row at the frame metrics: 60 pt minimum, no inset, 14 pt gap', async () => {
    const view = await renderUi(<SurahRow chapter={chapter} onPress={() => undefined} testID="row" />);

    expect(flatStyle(view.getByTestId('row').props.style)).toMatchObject({
      flexDirection: 'row',
      gap: 14,
      minHeight: 60,
    });
    expect(flatStyle(view.getByTestId('row').props.style).paddingHorizontal).toBeUndefined();
  });

  it('draws the start page and the meta line at 12 pt, weight 400', async () => {
    const view = await renderUi(<SurahRow chapter={chapter} onPress={() => undefined} />);

    expect(flatStyle(view.getByText('ص ٢').props.style)).toMatchObject({ fontFamily: 'IBMPlexSansArabic-Regular', fontSize: 12 });
    expect(flatStyle(view.getByText('مدنية · ٢٨٦ آية').props.style)).toMatchObject({ fontSize: 12 });
  });

  it('writes every number in Arabic-Indic digits: medallion, ayah count and start page', async () => {
    const view = await renderUi(<SurahRow chapter={chapter} onPress={() => undefined} testID="row" />);

    expect(view.getByText('٢', hidden)).toBeOnTheScreen();
    expect(view.getByTestId('row-number', hidden)).toBeOnTheScreen();
    expect(view.getByText('مدنية · ٢٨٦ آية')).toBeOnTheScreen();
    expect(view.getByText('ص ٢')).toBeOnTheScreen();
  });

  it.each([
    [7, 'مكية · ٧ آيات'],
    [286, 'مدنية · ٢٨٦ آية'],
  ] as const)('uses the Arabic plural for %i ayahs', async (count, meta) => {
    const view = await renderUi(
      <SurahRow
        chapter={{ ...chapter, revelationPlace: count === 7 ? 'makkah' : 'madinah', versesCount: count }}
        onPress={() => undefined}
      />,
    );

    expect(view.getByText(meta)).toBeOnTheScreen();
  });

  it('ends with the start page instead of a chevron in the index', async () => {
    const view = await renderUi(<SurahRow chapter={chapter} onPress={() => undefined} />);

    expect(view.queryByTestId('list-row-chevron', hidden)).toBeNull();
  });

  it('uses the high-contrast muted ink for the meta when Increase Contrast is on', async () => {
    jest.mocked(AccessibilityInfo.isDarkerSystemColorsEnabled).mockResolvedValue(true);
    const view = await renderUi(<SurahRow chapter={chapter} onPress={() => undefined} />, { theme: 'sepia' });

    await waitFor(() =>
      expect(flatStyle(view.getByText('مدنية · ٢٨٦ آية').props.style).color).toBe(highContrast.sepia.inkMuted),
    );
  });

  it('calls onPress when the row is pressed', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<SurahRow chapter={chapter} onPress={onPress} />);

    await fireEvent.press(view.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('labels the row with the name and metadata (%s)', async (locale) => {
    const view = await renderUi(<SurahRow chapter={chapter} onPress={() => undefined} />, { locale });
    const meta = locale === 'ar' ? 'مدنية · ٢٨٦ آية' : 'Medinan · 286 ayahs';

    expect(view.getByRole('button', { name: `البقرة, ${meta}` })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/library/components/SurahRow.tsx')).toEqual([]);
  });
});
