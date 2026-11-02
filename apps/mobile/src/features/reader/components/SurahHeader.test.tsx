import { highContrast, typeScale } from '@quran/design-tokens';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { formatNumber, i18n } from '@/core/i18n';
import { themes } from '@/core/theme';

import { openReaderTestContent } from '../../../../jest/reader-test-db';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { type ChapterRecord, getChapter } from '../data/chapters';
import { SurahHeader } from './SurahHeader';

let baqarah: ChapterRecord;
let fatiha: ChapterRecord;

beforeAll(async () => {
  const { executor } = await openReaderTestContent();
  baqarah = getChapter(executor, 2)!;
  fatiha = getChapter(executor, 1)!;
});

describe('SurahHeader', () => {
  it.each(locales)('shows the cartouche, revelation place and ayah count (%s)', async (locale) => {
    const view = await renderUi(<SurahHeader chapter={baqarah} testID="header" />, { locale });
    expect(view.getByRole('header')).toBeOnTheScreen();
    expect(view.getByTestId('header-cartouche')).toBeOnTheScreen();
    expect(view.getByText(i18n.t('reader.surahTitle', { name: baqarah.nameArabic }))).toBeOnTheScreen();
    expect(view.getByText(new RegExp(formatNumber(baqarah.versesCount, locale)))).toBeOnTheScreen();
  });

  it('draws the full cartouche: the band and the rosette, five strokes', async () => {
    const view = await renderUi(<SurahHeader chapter={baqarah} testID="header" />);
    await fireEvent(view.getByTestId('header-cartouche'), 'layout', {
      nativeEvent: { layout: { height: 112, width: 300, x: 0, y: 0 } },
    });

    expect(view.getAllByTestId(/^header-cartouche-stroke-/, { includeHiddenElements: true })).toHaveLength(5);
  });

  it('names the revelation place for each surah', async () => {
    const madinah = await renderUi(<SurahHeader chapter={baqarah} />);
    expect(madinah.getByText(/مدنية/)).toBeOnTheScreen();

    const makkah = await renderUi(<SurahHeader chapter={fatiha} />, { locale: 'en' });
    expect(makkah.getByText(/Meccan/)).toBeOnTheScreen();
  });

  it('sets the meta line in centred muted caption type', async () => {
    const view = await renderUi(<SurahHeader chapter={baqarah} />);
    const meta = view.getByText(/مدنية/);

    expect(flatStyle(meta.props.style)).toMatchObject({
      ...themes.light.text.caption,
      color: themes.light.colors.inkMuted,
      textAlign: 'center',
    });
    expect(meta.props.dynamicTypeRamp).toBe(typeScale.caption.ramp);
  });

  it('is announced as a header', async () => {
    const view = await renderUi(<SurahHeader chapter={baqarah} testID="header" />);
    expect(view.getByTestId('header').props.accessibilityRole).toBe('header');
  });

  it('switches the meta line to the Increase Contrast ink', async () => {
    const spy = jest.spyOn(AccessibilityInfo, 'isDarkerSystemColorsEnabled').mockResolvedValue(true);
    const view = await renderUi(<SurahHeader chapter={baqarah} />);

    await waitFor(() => {
      expect(flatStyle(view.getByText(/مدنية/).props.style).color).toBe(highContrast.light.inkMuted);
    });
    spy.mockRestore();
  });

  it('uses theme tokens only', () => {
    expect(featureComponentLiterals('features/reader/components/SurahHeader.tsx')).toEqual([]);
  });
});
