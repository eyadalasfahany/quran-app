import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { themes } from '@/core/theme';
import type { ChapterRecord } from '@/features/reader/data/chapters';

import { SurahResultRow } from './SurahResultRow';

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

describe('SurahResultRow', () => {
  it('draws the Search frame card: brand number tile, «سورة البقرة» in Amiri, the count and start page, a gold tag', async () => {
    const view = await renderUi(<SurahResultRow chapter={chapter} onPress={() => undefined} testID="surah-result" />);

    expect(flatStyle(view.getByTestId('surah-result-number').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.brandSurface,
      height: 44,
      width: 44,
    });
    expect(flatStyle(view.getByText('٢').props.style).color).toBe(themes.light.colors.onBrand);
    expect(flatStyle(view.getByText('سورة البقرة').props.style)).toMatchObject({ fontFamily: 'Amiri-Bold', fontSize: 20 });
    expect(view.getByText('٢٨٦ آية · تبدأ صفحة ٢')).toBeOnTheScreen();
    expect(flatStyle(view.getByText('سورة').props.style).color).toBe(themes.light.colors.goldInk);
    expect(view.queryByText('Al-Baqarah')).toBeNull();
  });

  it('uses the Arabic plural for a short surah', async () => {
    const view = await renderUi(
      <SurahResultRow chapter={{ ...chapter, id: 1, nameArabic: 'الفاتحة', pageStart: 1, versesCount: 7 }} onPress={() => undefined} />,
    );

    expect(view.getByText('٧ آيات · تبدأ صفحة ١')).toBeOnTheScreen();
  });

  it.each(locales)('is one button labelled with the title and hint (%s)', async (locale) => {
    const view = await renderUi(<SurahResultRow chapter={chapter} onPress={() => undefined} />, { locale });
    const name = locale === 'ar' ? 'سورة البقرة، ٢٨٦ آية · تبدأ صفحة ٢' : 'Surah Al-Baqarah, 286 ayahs · starts on page 2';

    expect(view.getByRole('button', { name })).toBeOnTheScreen();
  });

  it('calls onPress', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<SurahResultRow chapter={chapter} onPress={onPress} />);

    await fireEvent.press(view.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/search/components/SurahResultRow.tsx')).toEqual([]);
  });
});
