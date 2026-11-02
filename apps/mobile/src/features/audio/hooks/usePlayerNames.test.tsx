import { act, renderHook } from '@testing-library/react-native';

import { openContentDb } from '@/core/db/content/open';

import { listReciters, type CatalogReciter } from '../data/reciters';
import { usePlayerStore } from '../playerStore';
import { usePlayerNames } from './usePlayerNames';

jest.mock('@/core/db/content/open', () => ({ openContentDb: jest.fn() }));
jest.mock('../data/reciters', () => ({ listReciters: jest.fn() }));
jest.mock('@/features/reader/data/chapters', () => ({
  ...jest.requireActual('@/features/reader/data/chapters'),
  getChapter: jest.fn(() => undefined),
}));
jest.mock('@/core/i18n/useLocale', () => ({ useLocale: () => 'ar' }));

const open = jest.mocked(openContentDb);
const list = jest.mocked(listReciters);

const mishary = {
  resourceId: 30,
  name: 'Mishary Alafasy',
  nameAr: 'مشاري العفاسي',
  installed: true,
  packSizeBytes: 0,
  hasTimings: false,
  hasWordSegments: false,
  isDefault: true,
  style: null,
} as CatalogReciter;

beforeEach(() => {
  usePlayerStore.getState().reset();
  open.mockReset();
  list.mockReset();
  list.mockReturnValue([mishary]);
  open.mockReturnValue({ executor: {} } as ReturnType<typeof openContentDb>);
});

describe('usePlayerNames', () => {
  it('shows the reciter once the content database opens after a failed first render', async () => {
    // The mini player mounts before the content database is open: the first lookup throws.
    open.mockImplementationOnce(() => {
      throw new Error('content database is not open');
    });
    const view = await renderHook(() => usePlayerNames());
    expect(view.result.current.reciterName).toBe('');

    // The player starts a reciter; the next lookup opens the database and finds the name.
    await act(async () => {
      usePlayerStore.setState({ reciterId: 30 });
    });

    expect(view.result.current.reciterName).toBe('مشاري العفاسي');
  });

  it('falls back to the English name when the Arabic name is empty', async () => {
    list.mockReturnValue([{ ...mishary, nameAr: '' }]);
    const view = await renderHook(() => usePlayerNames());

    expect(view.result.current.reciterName).toBe('Mishary Alafasy');
  });
});
