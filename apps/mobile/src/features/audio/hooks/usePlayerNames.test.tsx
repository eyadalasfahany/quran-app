import { act, renderHook } from '@testing-library/react-native';

import { openContentDb } from '@/core/db/content/open';

import { listReciters, type CatalogReciter } from '../data/reciters';
import { usePlayerStore } from '../playerStore';
import { setReciterId } from '../settings';
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
  setReciterId(30);
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

  it('when paused the name is the selected reciter, not the stored one, and re-renders when the selection changes', async () => {
    const husary = { ...mishary, resourceId: 31, nameAr: 'محمود خليل الحصري', isDefault: false } as CatalogReciter;
    list.mockReturnValue([mishary, husary]);
    usePlayerStore.setState({ reciterId: 30, chapterId: 1, status: 'paused' });
    const view = await renderHook(() => usePlayerNames());
    expect(view.result.current.reciterName).toBe('مشاري العفاسي');

    await act(async () => {
      setReciterId(31);
    });

    expect(view.result.current.reciterName).toBe('محمود خليل الحصري');
    expect(view.result.current.reciter?.resourceId).toBe(31);
  });

  it('when playing the name is the stored reciter, even though another is selected', async () => {
    const husary = { ...mishary, resourceId: 31, nameAr: 'محمود خليل الحصري', isDefault: false } as CatalogReciter;
    list.mockReturnValue([mishary, husary]);
    setReciterId(31);
    usePlayerStore.setState({ reciterId: 30, chapterId: 1, status: 'playing' });

    const view = await renderHook(() => usePlayerNames());

    expect(view.result.current.reciterName).toBe('مشاري العفاسي');
  });

  it('while loading the name is the stored reciter too', async () => {
    const husary = { ...mishary, resourceId: 31, nameAr: 'محمود خليل الحصري', isDefault: false } as CatalogReciter;
    list.mockReturnValue([mishary, husary]);
    setReciterId(31);
    usePlayerStore.setState({ reciterId: 30, chapterId: 1, status: 'loading' });

    const view = await renderHook(() => usePlayerNames());

    expect(view.result.current.reciterName).toBe('مشاري العفاسي');
  });
});
