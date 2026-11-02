import { fireEvent } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { JuzRow } from './JuzRow';

const JUZ_1 = { juz: 1, verseKey: '1:1', chapterNameArabic: 'الفاتحة', chapterNameSimple: 'Al-Faatiha', verseNumber: 1 };
const JUZ_2 = { juz: 2, verseKey: '2:142', chapterNameArabic: 'البقرة', chapterNameSimple: 'Al-Baqara', verseNumber: 142 };
const JUZ_30 = { juz: 30, verseKey: '78:1', chapterNameArabic: 'النبإ', chapterNameSimple: 'An-Naba', verseNumber: 1 };

describe('JuzRow', () => {
  it('renders the juz number and the surah and ayah it starts at, in Arabic', async () => {
    const view = await renderUi(<JuzRow juz={JUZ_2} onPress={() => undefined} testID="juz-row" />);

    expect(view.getByText('يبدأ من سورة البقرة، الآية 142')).toBeOnTheScreen();
  });

  it('uses the transliterated surah name in English', async () => {
    const view = await renderUi(<JuzRow juz={JUZ_1} onPress={() => undefined} />, { locale: 'en' });

    expect(view.getByText('Starts at Surah Al-Faatiha, ayah 1')).toBeOnTheScreen();
  });

  it('calls onPress when the row is pressed', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<JuzRow juz={JUZ_2} onPress={onPress} />);

    await fireEvent.press(view.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('renders under %s direction', async (locale) => {
    const view = await renderUi(<JuzRow juz={JUZ_30} onPress={() => undefined} />, {
      locale,
    });

    expect(view.getByRole('button')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/library/components/JuzRow.tsx')).toEqual([]);
  });
});
