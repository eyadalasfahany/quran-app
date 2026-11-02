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
  it('reads «آخر قراءة: البقرة · الآية ٢٥٥» with «متابعة» in brand, on a raised card', async () => {
    const view = await renderUi(<ContinueReadingRow ayah={255} chapter={chapter} onPress={() => undefined} />);

    expect(view.getByText('آخر قراءة: البقرة · الآية ٢٥٥')).toBeOnTheScreen();
    expect(flatStyle(view.getByText('متابعة').props.style).color).toBe(themes.light.colors.brand);
    expect(view.queryByText('Al-Baqarah')).toBeNull();
  });

  it('draws the frame card: 10 / 14 padding, radius 16, a 10 pt gap and a bookmark at 20 pt', async () => {
    const view = await renderUi(<ContinueReadingRow ayah={255} chapter={chapter} onPress={() => undefined} testID="row" />);
    const card = flatStyle(view.getByTestId('row-card').props.style);

    expect(card).toMatchObject({ borderRadius: themes.light.radius.tile, gap: 10, paddingHorizontal: 14, paddingVertical: 10 });
    expect(flatStyle(view.getByText('متابعة').props.style)).toMatchObject({ fontFamily: 'IBMPlexSansArabic-SemiBold', fontSize: 13 });
    expect(flatStyle(view.getByTestId('row').props.style).marginBottom).toBe(14);
  });

  it.each(locales)('is one button with the whole line as its label (%s)', async (locale) => {
    const view = await renderUi(<ContinueReadingRow ayah={255} chapter={chapter} onPress={() => undefined} />, {
      locale,
    });
    const name =
      locale === 'ar' ? 'آخر قراءة: البقرة · الآية ٢٥٥، متابعة' : 'Last read: Al-Baqarah · ayah 255, Continue';

    expect(view.getByRole('button', { name })).toBeOnTheScreen();
  });

  it('calls onPress', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<ContinueReadingRow ayah={255} chapter={chapter} onPress={onPress} />);

    await fireEvent.press(view.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/library/components/ContinueReadingRow.tsx')).toEqual([]);
  });
});
