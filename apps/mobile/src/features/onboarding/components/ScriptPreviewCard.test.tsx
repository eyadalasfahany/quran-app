import type { SqlExecutor } from '@/core/db/sql-executor';
import { useContentReady } from '@/core/db/content/content-ready';
import { getVerseByKey } from '@/features/reader/data/verses';

import { openReaderTestContent } from '../../../../jest/reader-test-db';
import { locales, renderUi } from '../../../../jest/render-ui';

import { ScriptPreviewCard } from './ScriptPreviewCard';

let mockExecutor: SqlExecutor | undefined;

jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => {
    if (mockExecutor === undefined) {
      throw new Error('content database is not open');
    }
    return { db: {}, executor: mockExecutor };
  },
}));

let seeded: SqlExecutor;
let storedText: string;

beforeAll(async () => {
  seeded = (await openReaderTestContent()).executor;
  const verse = getVerseByKey(seeded, '1:1');
  if (verse === undefined) {
    throw new Error('The seed has no verse 1:1.');
  }
  storedText = verse.textUthmani;
});

beforeEach(() => {
  mockExecutor = seeded;
  useContentReady.setState({ ready: true, error: null });
});

afterEach(() => {
  useContentReady.setState({ ready: false, error: null });
});

describe('ScriptPreviewCard', () => {
  it('draws verse 1:1 as the seed stores it, not a literal', async () => {
    const view = await renderUi(<ScriptPreviewCard mode="reading" />);

    expect(view.getByText(storedText)).toBeOnTheScreen();
    expect(view.getByTestId('onboarding-script-preview')).toBeOnTheScreen();
  });

  it('draws the same stored text in the mushaf mode', async () => {
    const view = await renderUi(<ScriptPreviewCard mode="mushaf" />);

    expect(view.getByText(storedText)).toBeOnTheScreen();
  });

  it('draws no Quran text while the content database is not ready', async () => {
    useContentReady.setState({ ready: false, error: null });
    mockExecutor = undefined;

    const view = await renderUi(<ScriptPreviewCard mode="reading" />);

    expect(view.queryByText(storedText)).toBeNull();
    expect(view.getByTestId('onboarding-script-preview')).toBeOnTheScreen();
  });

  it('draws no Quran text when the database cannot be read', async () => {
    mockExecutor = undefined;

    const view = await renderUi(<ScriptPreviewCard mode="reading" />);

    expect(view.queryByText(storedText)).toBeNull();
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<ScriptPreviewCard mode="reading" />, { locale });

    expect(view.getByText(storedText)).toBeOnTheScreen();
  });
});
