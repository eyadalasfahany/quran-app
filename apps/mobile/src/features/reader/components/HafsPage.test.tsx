import { fireEvent } from '@testing-library/react-native';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { themes } from '@/core/theme';

import { openReaderTestContent } from '../../../../jest/reader-test-db';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { type ChapterRecord, listChapters } from '../data/chapters';
import { getVersesByPage } from '../data/verses';
import { HafsPage } from './HafsPage';

let executor: SqlExecutor;
let chapters: ReadonlyMap<number, ChapterRecord>;

beforeAll(async () => {
  ({ executor } = await openReaderTestContent());
  chapters = new Map(listChapters(executor).map((chapter) => [chapter.id, chapter]));
});

function hafsPage(page: number, props: Partial<Parameters<typeof HafsPage>[0]> = {}) {
  return (
    <HafsPage
      chapters={chapters}
      executor={executor}
      fontScale={1}
      page={page}
      testID="hafs"
      {...props}
    />
  );
}

describe('HafsPage', () => {
  it('renders the first page without a break before it', async () => {
    const view = await renderUi(hafsPage(1));

    expect(view.getByTestId('hafs-page-1')).toBeOnTheScreen();
    expect(view.queryByTestId('hafs-break-1')).toBeNull();
    for (const verse of getVersesByPage(executor, 1)) {
      expect(view.getByTestId(`hafs-page-1-ayah-${verse.verseKey}`).props.children).toBe(verse.textUthmani);
    }
  });

  it('leads a later page with the shared page divider and its place', async () => {
    const view = await renderUi(hafsPage(2));
    const label = view.getByText('صفحة ٢ · الجزء ١');

    expect(view.getByTestId('hafs-break-2')).toBeOnTheScreen();
    expect(flatStyle(label.props.style)).toMatchObject({ color: themes.light.colors.inkMuted });
    expect(view.getByTestId('hafs-page-2-surah-2')).toBeOnTheScreen();
  });

  it('forwards presses and long presses with the verse key', async () => {
    const onSelectVerseKey = jest.fn();
    const onOpenAyahActions = jest.fn();
    const view = await renderUi(hafsPage(1, { onOpenAyahActions, onSelectVerseKey }));

    await fireEvent.press(view.getByTestId('hafs-page-1-ayah-1:2'));
    expect(onSelectVerseKey).toHaveBeenCalledWith('1:2');
    await fireEvent(view.getByTestId('hafs-page-1-ayah-1:3'), 'longPress');
    expect(onOpenAyahActions).toHaveBeenCalledWith('1:3');
  });

  it('fills each highlighted ayah on the page with its saved colour', async () => {
    const second = getVersesByPage(executor, 1).find((verse) => verse.verseKey === '1:2');
    const view = await renderUi(hafsPage(1, { highlightsByVerseId: new Map([[second!.id, 'rose']]) }));

    expect(flatStyle(view.getByTestId('hafs-page-1-ayah-1:2').props.style).backgroundColor).toBe(
      themes.light.colors.highlightRose,
    );
    expect(flatStyle(view.getByTestId('hafs-page-1-ayah-1:1').props.style).backgroundColor).toBeUndefined();
  });

  it('marks the recited ayah for assistive tech', async () => {
    const view = await renderUi(hafsPage(1, { onOpenAyahActions: () => undefined, recitedVerseKey: '1:2' }));

    expect(view.getByRole('button', { name: 'الآية ٢' }).props.accessibilityState).toMatchObject({ selected: true });
    expect(view.getByRole('button', { name: 'الآية ١' }).props.accessibilityState).toMatchObject({ selected: false });
  });

  it('passes the place wash through to its ayahs (ADR 0070)', async () => {
    const view = await renderUi(hafsPage(1, { placeVerseKey: '1:2' }));

    expect(flatStyle(view.getByTestId('hafs-page-1-ayah-1:2').props.style).backgroundColor).toBe(
      themes.light.colors.highlightActive,
    );
    expect(flatStyle(view.getByTestId('hafs-page-1-ayah-1:1').props.style).backgroundColor).toBeUndefined();
  });

  it.each(locales)('formats the page break in %s', async (locale) => {
    const view = await renderUi(hafsPage(2), { locale });

    expect(view.getByText(locale === 'ar' ? 'صفحة ٢ · الجزء ١' : 'Page 2 · Juz 1')).toBeOnTheScreen();
  });

  it('uses theme tokens only', () => {
    expect(featureComponentLiterals('features/reader/components/HafsPage.tsx')).toEqual([]);
  });
});
