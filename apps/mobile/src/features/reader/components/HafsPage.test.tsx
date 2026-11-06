import { act, fireEvent, render } from '@testing-library/react-native';
import { View } from 'react-native';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { themes } from '@/core/theme';

import { openReaderTestContent } from '../../../../jest/reader-test-db';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { type ChapterRecord, listChapters } from '../data/chapters';
import { getVersesByPage } from '../data/verses';
import { measureWithin } from '../measure-within';
import { paragraphVerseRanges, surahRuns } from '../mushaf-paragraph';
import { HafsPage } from './HafsPage';

// The native measurement of a paragraph inside its page: each test sets where the paragraph's text sits.
jest.mock('../measure-within', () => ({ measureWithin: jest.fn() }));

let executor: SqlExecutor;
let chapters: ReadonlyMap<number, ChapterRecord>;

beforeAll(async () => {
  ({ executor } = await openReaderTestContent());
  chapters = new Map(listChapters(executor).map((chapter) => [chapter.id, chapter]));
});

afterEach(() => {
  jest.mocked(measureWithin).mockReset();
});

// Under Jest every host view shares one measureLayout mock. A bare view hands it over, so a test can script the
// native measurement of the surah run view.
async function sharedMeasureLayout(): Promise<jest.Mock> {
  let host: unknown = null;
  const probe = await render(
    <View
      ref={(node) => {
        if (node !== null) {
          host = node;
        }
      }}
    />,
  );
  await probe.unmount();
  return (host as { measureLayout: jest.Mock }).measureLayout;
}

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

  describe('measuring its paragraphs (ADR 0073)', () => {
    // Lays out the paragraph that starts with `firstKey`, as the native Text would report its lines.
    async function layOutParagraph(
      page: number,
      firstKey: string,
      lines: { height: number; text: string; y: number }[],
      props: Partial<Parameters<typeof HafsPage>[0]> = {},
    ) {
      const view = await renderUi(hafsPage(page, props));
      await act(async () => {
        view.getByTestId(`hafs-page-${page}-text-${firstKey}`).props.onTextLayout({ nativeEvent: { lines } });
      });
      return view;
    }

    it('reports the surah run and its lines with the text top, once measured', async () => {
      jest.mocked(measureWithin).mockImplementation((_node, _root, onMeasured) => onMeasured(300));
      const lines = [{ height: 50, text: 'ab', y: 0 }];
      const onRunMeasured = jest.fn();

      await layOutParagraph(1, '1:1', lines, { onRunMeasured });

      expect(onRunMeasured).toHaveBeenCalledTimes(1);
      const [page, measured] = onRunMeasured.mock.calls[0];
      expect(page).toBe(1);
      expect(measured.textTop).toBe(300);
      expect(measured.lines).toBe(lines);
      expect(measured.run.map((verse: { verseKey: string }) => verse.verseKey)).toEqual(
        getVersesByPage(executor, 1).map((verse) => verse.verseKey),
      );
    });

    it('reports nothing when the text top is not measured', async () => {
      jest.mocked(measureWithin).mockImplementation((_node, _root, onMeasured) => onMeasured(null));
      const onRunMeasured = jest.fn();

      await layOutParagraph(1, '1:1', [{ height: 50, text: 'ab', y: 0 }], { onRunMeasured });

      expect(onRunMeasured).not.toHaveBeenCalled();
    });

    it('a mid-page focus ayah calls onFocusOffset with the text top plus its line, once', async () => {
      const run = surahRuns(getVersesByPage(executor, 2))[0]!;
      const focus = run.find((verse) => verse.verseNumber === 2)!;
      expect(focus.chapterId).toBe(2);
      const start = paragraphVerseRanges(run).find((range) => range.verseKey === focus.verseKey)!.start;
      // The line break falls where the ayah starts, so the focus sits on the second line (y 50).
      const lines = [
        { height: 50, text: 'x'.repeat(start), y: 0 },
        { height: 50, text: 'y', y: 50 },
      ];
      jest.mocked(measureWithin).mockImplementation((_node, _root, onMeasured) => onMeasured(300));
      const onFocusOffset = jest.fn();
      const measureLayout = await sharedMeasureLayout();
      measureLayout.mockImplementation((_root: unknown, onSuccess: (x: number, y: number) => void) => onSuccess(0, 250));

      try {
        const view = await layOutParagraph(2, run[0]!.verseKey, lines, { focusVerseKey: focus.verseKey, onFocusOffset });
        // The run view is laid out too, but a mid-page ayah is placed by its line, not by the run.
        await fireEvent(view.getByTestId('hafs-page-2-focus-run'), 'layout', {
          nativeEvent: { layout: { height: 300, width: 320, x: 0, y: 400 } },
        });

        expect(onFocusOffset).toHaveBeenCalledTimes(1);
        expect(onFocusOffset).toHaveBeenCalledWith(2, 350);
      } finally {
        measureLayout.mockReset();
      }
    });

    it("a surah's first ayah is placed by its run view, so its title stays in view", async () => {
      jest.mocked(measureWithin).mockImplementation((_node, _root, onMeasured) => onMeasured(300));
      const onFocusOffset = jest.fn();
      const lines = [{ height: 50, text: 'ab', y: 0 }];
      const measureLayout = await sharedMeasureLayout();
      measureLayout.mockImplementation((_root: unknown, onSuccess: (x: number, y: number) => void) => onSuccess(0, 250));

      try {
        const view = await layOutParagraph(2, '2:1', lines, { focusVerseKey: '2:1', onFocusOffset });
        expect(onFocusOffset).not.toHaveBeenCalled();

        await fireEvent(view.getByTestId('hafs-page-2-focus-run'), 'layout', {
          nativeEvent: { layout: { height: 300, width: 320, x: 0, y: 400 } },
        });

        expect(onFocusOffset).toHaveBeenCalledTimes(1);
        expect(onFocusOffset).toHaveBeenCalledWith(2, 250);
      } finally {
        measureLayout.mockReset();
      }
    });
  });

  it('uses theme tokens only', () => {
    expect(featureComponentLiterals('features/reader/components/HafsPage.tsx')).toEqual([]);
  });
});
