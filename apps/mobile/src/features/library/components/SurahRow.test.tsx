import { highContrast } from '@quran/design-tokens';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { themes } from '@/core/theme';
import type { ChapterRecord } from '@/features/reader/data/chapters';

import { SurahRow } from './SurahRow';

const colors = themes.light.colors;

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
  beforeEach(() => {
    jest.mocked(AccessibilityInfo.isDarkerSystemColorsEnabled).mockResolvedValue(false);
  });

  it('renders the surah names and metadata', async () => {
    const view = await renderUi(<SurahRow chapter={chapter} onPress={() => undefined} testID="surah-row" />);

    expect(view.getByText('Al-Fatihah')).toBeOnTheScreen();
    expect(view.getByText('الفاتحة')).toBeOnTheScreen();
    expect(view.getByText('1')).toBeOnTheScreen();
    expect(view.getByText('مكية · 7 آيات')).toBeOnTheScreen();
  });

  it('draws the index number as a muted caption', async () => {
    const view = await renderUi(<SurahRow chapter={chapter} onPress={() => undefined} />);

    expect(flatStyle(view.getByText('1').props.style)).toMatchObject({
      ...themes.light.text.caption,
      color: colors.inkMuted,
      textAlign: 'center',
    });
  });

  it('uses the high-contrast muted ink for the number when Increase Contrast is on', async () => {
    jest.mocked(AccessibilityInfo.isDarkerSystemColorsEnabled).mockResolvedValue(true);
    const view = await renderUi(<SurahRow chapter={chapter} onPress={() => undefined} />, { theme: 'sepia' });

    await waitFor(() =>
      expect(flatStyle(view.getByText('1').props.style).color).toBe(highContrast.sepia.inkMuted),
    );
  });

  it('draws the result variant with a brand number and a custom subtitle', async () => {
    const view = await renderUi(
      <SurahRow chapter={chapter} onPress={() => undefined} subtitle="hint" variant="result" />,
    );

    expect(flatStyle(view.getByText('1').props.style)).toMatchObject({
      ...themes.light.text.headline,
      color: colors.brand,
    });
    expect(view.getByText('hint')).toBeOnTheScreen();
    expect(view.queryByText('مكية · 7 آيات')).toBeNull();
    expect(view.getByText('الفاتحة')).toBeOnTheScreen();
  });

  it('calls onPress when the row is pressed', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<SurahRow chapter={chapter} onPress={onPress} />);

    await fireEvent.press(view.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('labels the row button with the name and metadata', async () => {
    const view = await renderUi(<SurahRow chapter={chapter} onPress={() => undefined} />);

    expect(view.getByRole('button', { name: 'Al-Fatihah, مكية · 7 آيات' })).toBeOnTheScreen();
  });

  it.each(locales)('uses Amiri for the Arabic name (%s)', async (locale) => {
    const view = await renderUi(<SurahRow chapter={chapter} onPress={() => undefined} />, { locale });

    expect(flatStyle(view.getByText('الفاتحة').props.style)).toMatchObject({
      fontFamily: 'Amiri-Bold',
      textAlign: 'center',
      writingDirection: 'rtl',
    });
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/library/components/SurahRow.tsx')).toEqual([]);
  });
});
