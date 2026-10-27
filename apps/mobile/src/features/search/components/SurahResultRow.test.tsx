import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
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
  it('renders the surah number and names', async () => {
    const view = await renderUi(<SurahResultRow chapter={chapter} onPress={() => undefined} testID="surah-result" />);

    expect(view.getByText('Al-Baqarah')).toBeOnTheScreen();
    expect(view.getByText('البقرة')).toBeOnTheScreen();
    expect(view.getByText('2')).toBeOnTheScreen();
  });

  it('calls onPress when the row is pressed', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<SurahResultRow chapter={chapter} onPress={onPress} />);

    await fireEvent.press(view.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('uses Amiri for the Arabic name (%s)', async (locale) => {
    const view = await renderUi(<SurahResultRow chapter={chapter} onPress={() => undefined} />, { locale });

    expect(flatStyle(view.getByText('البقرة').props.style).fontFamily).toBe('Amiri-Bold');
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/search/components/SurahResultRow.tsx')).toEqual([]);
  });
});
