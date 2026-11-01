import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi, svgPaint } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { amiriNaturalLeading } from '@quran/design-tokens';
import { themes } from '@/core/theme';

import { ContinueReadingCard } from './ContinueReadingCard';

const colors = themes.light.colors;
const props = { ayah: 255, juz: 3, onPress: () => undefined, page: 42, surahName: 'البقرة' };

describe('ContinueReadingCard', () => {
  it('draws the brand card from the Home frame', async () => {
    const view = await renderUi(<ContinueReadingCard {...props} />);

    expect(flatStyle(view.getByTestId('home-continue-reading').props.style)).toMatchObject({
      backgroundColor: colors.brandSurface,
      borderRadius: 24,
      gap: 6,
      padding: 22,
    });
    expect(flatStyle(view.getByText('سورة البقرة').props.style)).toMatchObject({ color: colors.onBrandSurface, fontSize: 34 });
    expect(view.getByText('الآية ٢٥٥ · صفحة ٤٢ · الجزء ٣')).toBeOnTheScreen();
    expect(flatStyle(view.getByText('تابع القراءة').props.style)).toMatchObject({
      color: colors.onBrandSurfaceMuted,
      fontFamily: 'IBMPlexSansArabic-Medium',
      fontSize: 13,
    });
    expect(flatStyle(view.getByText('متابعة').props.style)).toMatchObject({
      color: colors.onBrandSurface,
      fontFamily: 'IBMPlexSansArabic-SemiBold',
      fontSize: 13,
    });
  });

  it.each(['light', 'dark'] as const)('draws the title and the resume action in the on-brand surface token in %s', async (theme) => {
    const view = await renderUi(<ContinueReadingCard {...props} />, { theme });

    expect(flatStyle(view.getByText('سورة البقرة').props.style).color).toBe(themes[theme].colors.onBrandSurface);
    expect(flatStyle(view.getByText('متابعة').props.style).color).toBe(themes[theme].colors.onBrandSurface);
  });

  it('gives the title a line height of at least Amiri natural leading', async () => {
    const view = await renderUi(<ContinueReadingCard {...props} />);

    expect(flatStyle(view.getByText('سورة البقرة').props.style).lineHeight).toBeGreaterThanOrEqual(Math.round(34 * amiriNaturalLeading));
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

  it.each(locales)('sets the gold rosette over the top trailing corner, out of the label (%s)', async (locale) => {
    const view = await renderUi(<ContinueReadingCard {...props} />, { locale });
    const rosette = view.getByTestId('home-continue-reading-rosette', { includeHiddenElements: true });

    expect(flatStyle(view.getByTestId('home-continue-reading').props.style).overflow).toBe('hidden');
    expect(flatStyle(rosette.props.style)).toMatchObject({
      end: -40,
      height: 180,
      opacity: themes.light.opacity.ornament,
      position: 'absolute',
      top: -40,
    });
    expect(view.getByTestId('home-continue-reading-rosette-stroke-0', { includeHiddenElements: true }).props.stroke).toEqual(
      svgPaint(colors.goldOnBrandSurface),
    );
    expect(rosette.props.accessibilityElementsHidden).toBe(true);
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
