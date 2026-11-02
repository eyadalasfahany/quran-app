import type { SqlExecutor } from '@/core/db/sql-executor';

import { openReaderTestContent } from '../../../../jest/reader-test-db';
import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { resetWindowSize, setWindowSize } from '../../../../jest/window-size';
import { getVerseByKey } from '../data/verses';

import { InlineTafsirPassage } from './InlineTafsirPassage';

function installTafsir(db: SqlExecutor, resourceId: number): void {
  db.run(
    `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at, change_cursor)
     VALUES (?, 'tafsirs', 1, 'sha', 0, NULL)`,
    [resourceId],
  );
}

describe('InlineTafsirPassage', () => {
  let executor: SqlExecutor;

  afterEach(() => {
    resetWindowSize();
  });

  beforeAll(async () => {
    executor = (await openReaderTestContent()).executor;
    installTafsir(executor, 16);
    executor.run(
      `INSERT INTO tafsir_entries (resource_id, group_tafsir_id, first_verse_id, last_verse_id, html)
       VALUES (16, 1, 8, 8, '<p>FIXTURE passage 1 — not tafsir</p>')`,
    );
  });

  it('asks for a tafsir when none is selected', async () => {
    const verse = getVerseByKey(executor, '2:1');
    expect(verse).toBeDefined();

    const view = await renderUi(
      <InlineTafsirPassage executor={executor} resourceId={null} verse={verse!} />,
      { locale: 'en' },
    );

    expect(view.getByTestId('inline-tafsir-passage')).toBeOnTheScreen();
    expect(view.getByText('Choose a tafsir in reading settings to show passages here.')).toBeOnTheScreen();
  });

  it('renders a passage when the tafsir has an entry', async () => {
    const verse = getVerseByKey(executor, '2:1');
    expect(verse).toBeDefined();

    setWindowSize(390, 800);
    const view = await renderUi(
      <InlineTafsirPassage executor={executor} resourceId={16} verse={verse!} />,
      { locale: 'ar' },
    );

    expect(view.getByTestId('inline-tafsir-passage')).toBeOnTheScreen();
    expect(view.queryByTestId('inline-tafsir-passage-no-entry')).toBeNull();
    expect(flatStyle(view.getByTestId('inline-tafsir-passage-scroll').props.style).height).toBe(400);
  });

  it('shows the missing-entry message when the tafsir has no passage', async () => {
    const verse = getVerseByKey(executor, '1:1');
    expect(verse).toBeDefined();

    const view = await renderUi(
      <InlineTafsirPassage executor={executor} resourceId={16} verse={verse!} />,
      { locale: 'en' },
    );

    expect(view.getByTestId('inline-tafsir-passage-no-entry')).toBeOnTheScreen();
    expect(view.getByText('This tafsir has no passage for this ayah.')).toBeOnTheScreen();
  });
});
