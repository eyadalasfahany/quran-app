import { fireEvent } from '@testing-library/react-native';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { i18n } from '@/core/i18n';
import { firstVerseOfPage } from '@/features/reader/anchor/page';
import { QCF_V2_MUSHAF_ID } from '@/features/reader/mushaf/constants';
import { mushafPageHeight } from '@/features/reader/mushaf/page-metrics';
import type { MushafPageFontState } from '@/features/reader/mushaf/useMushafPageFont';

import { openReaderTestContent } from '../../../../jest/reader-test-db';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { chapterOneStart, GLYPH_AL_FATIHA_1, pageOneLines } from '../mushaf/__fixtures__/mushaf-pages.fixture';
import { MushafListPage } from './MushafListPage';

let mockFont: MushafPageFontState = { status: 'ready', fontFamily: 'qcf-v2-p1' };

jest.mock('@/features/reader/mushaf/useMushafPageFont', () => ({
  useMushafPageFont: () => mockFont,
}));

let executor: SqlExecutor;

// Installs the fixture's page 1 layout; page 2 stays uninstalled.
beforeAll(async () => {
  ({ executor } = await openReaderTestContent());
  executor.run(
    `INSERT INTO mushaf_pages (mushaf_id, page_number, first_verse_id, last_verse_id, first_word_id, last_word_id, verse_mapping)
     VALUES (?, 1, 1, 1, 1, 3, '{}')`,
    [QCF_V2_MUSHAF_ID],
  );
  for (const line of pageOneLines) {
    for (const word of line.words) {
      executor.run(
        `INSERT INTO word_layouts (mushaf_id, word_id, verse_id, position_in_verse, char_type, glyph, page, line, position_in_line)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [QCF_V2_MUSHAF_ID, word.wordId, word.verseId, word.positionInVerse, word.charType, word.glyph, line.line, word.positionInLine],
      );
    }
  }
});

beforeEach(() => {
  mockFont = { status: 'ready', fontFamily: 'qcf-v2-p1' };
});

const contentWidth = 360;
const framePadding = 8;

function listPage(page: number, props: Partial<Parameters<typeof MushafListPage>[0]> = {}) {
  return (
    <MushafListPage
      activeVerseId={null}
      chapterStarts={page === 1 ? [chapterOneStart] : []}
      contentWidth={contentWidth}
      executor={executor}
      framePadding={framePadding}
      highlightsByVerseId={new Map()}
      page={page}
      selectedVerseId={null}
      testID="mushaf-page"
      {...props}
    />
  );
}

describe('MushafListPage', () => {
  it('renders the installed page in its page font once the font is ready', async () => {
    const view = await renderUi(listPage(1));

    expect(view.getByTestId('mushaf-page')).toBeOnTheScreen();
    expect(view.getByTestId('mushaf-page-header-2')).toBeOnTheScreen();
    expect(view.getByText(GLYPH_AL_FATIHA_1)).toBeOnTheScreen();
    const lineText = view.getByTestId('mushaf-page-line-3').children[0];
    expect(typeof lineText === 'object' && flatStyle(lineText.props.style).fontFamily).toBe('qcf-v2-p1');
  });

  it('forwards presses and long presses with the verse id', async () => {
    const onSelectVerseId = jest.fn();
    const onOpenAyahActions = jest.fn();
    const view = await renderUi(listPage(1, { onOpenAyahActions, onSelectVerseId }));

    await fireEvent.press(view.getByText(GLYPH_AL_FATIHA_1));
    expect(onSelectVerseId).toHaveBeenCalledWith(1);
    await fireEvent(view.getByText(GLYPH_AL_FATIHA_1), 'longPress');
    expect(onOpenAyahActions).toHaveBeenCalledWith(1);
  });

  it('holds the page height while the font loads', async () => {
    mockFont = { status: 'loading' };
    const view = await renderUi(listPage(1));

    expect(flatStyle(view.getByTestId('mushaf-page-loading').props.style).minHeight).toBe(
      mushafPageHeight(contentWidth, framePadding),
    );
    expect(view.queryByTestId('mushaf-page')).toBeNull();
  });

  it('offers Reading mode when the page font fails', async () => {
    mockFont = { status: 'error' };
    const onSwitchToReading = jest.fn();
    const view = await renderUi(listPage(1, { onSwitchToReading }));

    expect(view.getByTestId('mushaf-page-placeholder')).toBeOnTheScreen();
    expect(view.getByRole('header', { name: 'هذه الصفحة غير جاهزة' })).toBeOnTheScreen();
    await fireEvent.press(view.getByRole('button', { name: 'اقرأ في وضع القراءة' }));
    expect(onSwitchToReading).toHaveBeenCalledWith('1:1');
  });

  it('shows the missing-layout copy for a page that is not installed', async () => {
    const onSwitchToReading = jest.fn();
    const view = await renderUi(listPage(2, { onSwitchToReading }));

    expect(view.getByText(i18n.t('reader.mushaf.missingLayoutBody'))).toBeOnTheScreen();
    await fireEvent.press(view.getByRole('button'));
    expect(onSwitchToReading).toHaveBeenCalledWith(firstVerseOfPage(executor, 2));
  });

  it.each(locales)('renders the page and its placeholder in %s', async (locale) => {
    const ready = await renderUi(listPage(1), { locale });
    expect(ready.getByRole('header', { name: chapterOneStart.nameArabic })).toBeOnTheScreen();

    const missing = await renderUi(listPage(2, { onSwitchToReading: () => undefined }), { locale });
    expect(missing.getByRole('button')).toBeOnTheScreen();
  });

  it('uses theme tokens only', () => {
    expect(featureComponentLiterals('features/reader/components/MushafListPage.tsx')).toEqual([]);
  });
});
