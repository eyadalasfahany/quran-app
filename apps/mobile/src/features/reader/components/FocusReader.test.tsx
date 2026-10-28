import { fireEvent } from '@testing-library/react-native';

import type { SqlExecutor } from '@/core/db/sql-executor';

import { openReaderTestContent } from '../../../../jest/reader-test-db';
import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { getVerseByKey } from '../data/verses';
import { FocusReader } from './FocusReader';

let mockTestExecutor: SqlExecutor;

jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => ({ db: {}, executor: mockTestExecutor }),
}));

beforeAll(async () => {
  mockTestExecutor = (await openReaderTestContent()).executor;
});

function verse(key: string) {
  const record = getVerseByKey(mockTestExecutor, key);
  expect(record).toBeDefined();
  return record!;
}

const hidden = { includeHiddenElements: true } as const;

describe('FocusReader', () => {
  it.each(locales)('shows the ayah with the one before and after it in %s', async (locale) => {
    const view = await renderUi(<FocusReader onVerseChange={() => undefined} verseKey="1:5" />, {
      locale,
    });

    expect(view.getByTestId('focus-stage-current').props.children).toBe(verse('1:5').textUthmani);
    expect(view.getByTestId('focus-stage-previous', hidden)).toHaveTextContent(verse('1:4').textUthmani, { exact: false });
    expect(view.getByTestId('focus-stage-next', hidden)).toHaveTextContent(verse('1:6').textUthmani, { exact: false });
  });

  it('has nothing before the first ayah of a surah', async () => {
    const view = await renderUi(<FocusReader onVerseChange={() => undefined} verseKey="1:1" />);

    expect(view.queryByTestId('focus-stage-previous', hidden)).toBeNull();
    expect(view.getByTestId('focus-transport-previous').props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('moves to the neighbouring ayah and opens actions for the current one', async () => {
    const onVerseChange = jest.fn();
    const onOpenActions = jest.fn();
    const view = await renderUi(
      <FocusReader onOpenActions={onOpenActions} onVerseChange={onVerseChange} verseKey="1:5" />,
    );

    await fireEvent.press(view.getByTestId('focus-transport-next'));
    await fireEvent.press(view.getByTestId('focus-transport-previous'));
    await fireEvent.press(view.getByTestId('focus-progress-page-7', hidden));
    expect(onVerseChange.mock.calls).toEqual([['1:6'], ['1:4'], ['1:7']]);

    await fireEvent.press(view.getByRole('button', { name: 'الآية ٥' }));
    expect(onOpenActions).toHaveBeenCalledWith('1:5');
  });

  it('renders nothing for a verse key it cannot find', async () => {
    const view = await renderUi(<FocusReader onVerseChange={() => undefined} verseKey="999:1" />);

    expect(view.queryByTestId('focus-stage')).toBeNull();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/reader/components/FocusReader.tsx')).toEqual([]);
  });
});
