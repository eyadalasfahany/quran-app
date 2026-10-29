import { playFromVerse } from './player';
import { usePlayerStore } from './playerStore';
import { downloadReciterPack } from './reciter-downloads';
import { catalogueReciter, playVerse } from './play-verse';
import { listReciters } from './data/reciters';
import { getReciterId, setReciterId } from './settings';

jest.mock('./player', () => ({ playFromVerse: jest.fn(() => Promise.resolve()) }));
jest.mock('./reciter-downloads', () => ({ downloadReciterPack: jest.fn(() => Promise.resolve(true)) }));
jest.mock('./settings', () => ({ getReciterId: jest.fn(() => null), setReciterId: jest.fn() }));
jest.mock('./data/reciters', () => ({ listReciters: jest.fn(() => []) }));
jest.mock('@/core/db/content/open', () => ({ openContentDb: () => ({ executor: {} }) }));

const reciter = (resourceId: number, installed: boolean, isDefault = false) => ({
  hasTimings: true,
  hasWordSegments: true,
  installed,
  isDefault,
  name: 'R',
  nameAr: 'ق',
  packSizeBytes: 1,
  resourceId,
});

describe('playVerse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePlayerStore.getState().reset();
  });

  it('is unavailable with no reciter in the catalogue', () => {
    (listReciters as jest.Mock).mockReturnValue([]);
    expect(catalogueReciter()).toBeNull();
  });

  it('resolves the default reciter when none is saved', () => {
    (listReciters as jest.Mock).mockReturnValue([reciter(1, false), reciter(2, true, true)]);
    expect(catalogueReciter()?.resourceId).toBe(2);
  });

  it('plays an installed reciter from the ayah without installing', async () => {
    (listReciters as jest.Mock).mockReturnValue([reciter(2, true, true)]);
    await playVerse('2:255');
    expect(downloadReciterPack).not.toHaveBeenCalled();
    expect(setReciterId).toHaveBeenCalledWith(2);
    expect(playFromVerse).toHaveBeenCalledWith('2:255');
  });

  it('installs an uninstalled reciter first, then plays', async () => {
    (listReciters as jest.Mock).mockReturnValue([reciter(3, false, true)]);
    await playVerse('1:1');
    expect(downloadReciterPack).toHaveBeenCalledWith(3);
    expect(playFromVerse).toHaveBeenCalledWith('1:1');
  });

  it('does not play when the install fails', async () => {
    (listReciters as jest.Mock).mockReturnValue([reciter(3, false, true)]);
    (downloadReciterPack as jest.Mock).mockResolvedValueOnce(false);
    await playVerse('1:1');
    expect(playFromVerse).not.toHaveBeenCalled();
  });

  it('leaves a saved choice alone when it already matches', async () => {
    (listReciters as jest.Mock).mockReturnValue([reciter(2, true, true)]);
    (getReciterId as jest.Mock).mockReturnValue(2);
    await playVerse('2:1');
    expect(setReciterId).not.toHaveBeenCalled();
  });

  it('fails with no reciter instead of playing', async () => {
    (listReciters as jest.Mock).mockReturnValue([]);
    await playVerse('2:1');
    expect(playFromVerse).not.toHaveBeenCalled();
    expect(usePlayerStore.getState().error).toBe('no-reciter');
  });
});
