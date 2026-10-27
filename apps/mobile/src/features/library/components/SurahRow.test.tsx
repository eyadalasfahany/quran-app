import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import type { ChapterRecord } from '@/features/reader/data/chapters';

import { SurahRow } from './SurahRow';

const chapter: ChapterRecord = {
  id: 1,
  nameArabic: 'الفاتحة',
  nameSimple: 'Al-Fatihah',
  nameEn: 'The Opening',
  revelationPlace: 'makkah',
  revelationOrder: 5,
  versesCount: 7,
  bismillahPre: 1,
  bismillahText: null,
  bismillahImlaei: null,
  pageStart: 1,
  pageEnd: 1,
};

describe('SurahRow', () => {
  it('renders the surah names and metadata', async () => {
    const view = await renderUi(<SurahRow chapter={chapter} onPress={() => undefined} testID="surah-row" />);

    expect(view.getByText('Al-Fatihah')).toBeOnTheScreen();
    expect(view.getByText('الفاتحة')).toBeOnTheScreen();
    expect(view.getByText('1')).toBeOnTheScreen();
  });

  it('calls onPress when the row is pressed', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<SurahRow chapter={chapter} onPress={onPress} />);

    await fireEvent.press(view.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('uses Amiri for the Arabic name (%s)', async (locale) => {
    const view = await renderUi(<SurahRow chapter={chapter} onPress={() => undefined} />, { locale });

    expect(flatStyle(view.getByText('الفاتحة').props.style).fontFamily).toBe('Amiri-Bold');
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/library/components/SurahRow.tsx')).toEqual([]);
  });
});
