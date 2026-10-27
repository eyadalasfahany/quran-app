import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { MUSHAF_PAGE_MAX } from '@/features/reader/layout';
import { mushafFontSize } from '@/features/reader/mushaf/page-metrics';
import { buildMushafLineSlots } from '@/features/reader/mushaf/page-slots';

import { MushafPage } from './MushafPage';
import {
  chapterOneStart,
  chapterTwoStart,
  GLYPH_AL_FATIHA_1,
  GLYPH_BAQARAH_1,
  pageOneLines,
  pageTwoLines,
} from '../mushaf/__fixtures__/mushaf-pages.fixture';

const chapterForVerse = (verseId: number) => (verseId <= 7 ? 1 : 2);

describe('MushafPage', () => {
  it('renders 15 slots on page 1 with a surah cartouche', async () => {
    const view = await renderUi(
      <MushafPage
        chapterForVerse={chapterForVerse}
        chapterStarts={[chapterOneStart]}
        contentWidth={360}
        fontFamily="qcf-v2-p1"
        lines={pageOneLines}
        testID="page"
      />,
    );

    expect(buildMushafLineSlots(pageOneLines, [chapterOneStart], chapterForVerse)).toHaveLength(15);
    expect(view.getByTestId('page-header-2')).toBeOnTheScreen();
    expect(view.getByText(GLYPH_AL_FATIHA_1)).toBeOnTheScreen();
  });

  it('shows bismillah on page 2 after the surah cartouche', async () => {
    const view = await renderUi(
      <MushafPage
        chapterForVerse={chapterForVerse}
        chapterStarts={[chapterTwoStart]}
        contentWidth={360}
        fontFamily="qcf-v2-p2"
        lines={pageTwoLines}
        testID="page2"
      />,
    );

    expect(view.getByTestId('page2-header-1')).toBeOnTheScreen();
    expect(view.getByTestId('page2-bismillah-2')).toBeOnTheScreen();
    expect(view.getByText(chapterTwoStart.bismillahText!)).toBeOnTheScreen();
    expect(view.getByText(GLYPH_BAQARAH_1)).toBeOnTheScreen();
  });

  it('caps width at 640 and derives font size from width', async () => {
    const width = MUSHAF_PAGE_MAX;
    const view = await renderUi(
      <MushafPage
        chapterForVerse={chapterForVerse}
        chapterStarts={[chapterOneStart]}
        contentWidth={width}
        fontFamily="qcf-v2-p1"
        lines={pageOneLines}
        testID="wide"
      />,
    );
    expect(flatStyle(view.getByTestId('wide').props.style).width).toBe(MUSHAF_PAGE_MAX);
    expect(mushafFontSize(width)).toBe(width / 25);
  });

  it('forwards presses to the verse id', async () => {
    const onPress = jest.fn();
    const view = await renderUi(
      <MushafPage
        chapterForVerse={chapterForVerse}
        chapterStarts={[chapterOneStart]}
        contentWidth={360}
        fontFamily="qcf-v2-p1"
        lines={pageOneLines}
        onVersePress={onPress}
      />,
    );
    fireEvent.press(view.getByText(GLYPH_AL_FATIHA_1));
    expect(onPress).toHaveBeenCalledWith(1);
  });

  it.each(locales)('renders in %s', async (locale) => {
    const view = await renderUi(
      <MushafPage
        chapterForVerse={chapterForVerse}
        chapterStarts={[chapterOneStart]}
        contentWidth={360}
        fontFamily="qcf-v2-p1"
        lines={pageOneLines}
      />,
      { locale },
    );
    expect(view.getByText(chapterOneStart.nameArabic)).toBeOnTheScreen();
  });

  it('uses theme tokens only', () => {
    expect(featureComponentLiterals('features/reader/components/MushafPage.tsx')).toEqual([]);
  });
});
