import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { themes } from '@/core/theme';

import { ContinueReadingCard } from './ContinueReadingCard';

const colors = themes.light.colors;
const props = { ayah: 255, juz: 3, onPress: () => undefined, page: 42, surahName: 'البقرة' };

describe('ContinueReadingCard', () => {
  it('draws the brand card from the Home frame', async () => {
    const view = await renderUi(<ContinueReadingCard {...props} />);

    expect(flatStyle(view.getByTestId('home-continue-reading').props.style)).toMatchObject({
      backgroundColor: colors.brandSurface,
      padding: 20,
    });
    expect(flatStyle(view.getByText('سورة البقرة').props.style)).toMatchObject({ color: colors.onBrand, fontSize: 34 });
    expect(view.getByText('الآية ٢٥٥ · صفحة ٤٢ · الجزء ٣')).toBeOnTheScreen();
    expect(flatStyle(view.getByText('تابع القراءة').props.style).color).toBe(colors.onBrandSurfaceMuted);
  });

  it('fills the progress bar to the page’s share of the mushaf', async () => {
    const view = await renderUi(<ContinueReadingCard {...props} page={302} />);

    expect(flatStyle(view.getByTestId('home-continue-reading-progress').props.style)).toMatchObject({
      backgroundColor: colors.gold,
      width: '50%',
    });
  });

  it.each(locales)('is one button labelled with the place, with progress as its hint (%s)', async (locale) => {
    const view = await renderUi(<ContinueReadingCard {...props} />, { locale });
    const button = view.getByRole('button');

    expect(button.props.accessibilityLabel).toBe(
      locale === 'ar'
        ? 'تابع القراءة, سورة البقرة, الآية ٢٥٥ · صفحة ٤٢ · الجزء ٣'
        : 'Continue reading, Surah البقرة, Ayah 255 · page 42 · juz 3',
    );
    expect(button.props.accessibilityHint).toBe(locale === 'ar' ? 'قرأت ٧٪ من المصحف' : '7% of the Quran read');
  });

  it('calls onPress', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<ContinueReadingCard {...props} onPress={onPress} />);

    await fireEvent.press(view.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/home/components/ContinueReadingCard.tsx')).toEqual([]);
  });
});
