import { act } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { initialPlayerState, usePlayerStore } from '@/features/audio/playerStore';

import { usePlaybackReadingPlace } from './usePlaybackReadingPlace';
import { writePlayedPlace } from './reading-anchor';

// The reader's place is the Mushaf's continue-reading place (ADR 0046 §1). A dua's verse range never moves it (ADR 0092).

jest.mock('@/core/db/content/open', () => ({ openContentDb: () => ({ executor: {} }) }));
jest.mock('../data/verses', () => ({ idToVerseKey: (_db: unknown, id: number) => (id === 9 ? '2:2' : id === 10 ? '2:3' : undefined) }));
jest.mock('./page', () => ({ pageForVerse: () => 2 }));
jest.mock('./reading-anchor', () => ({ writePlayedPlace: jest.fn() }));

const mockWrite = writePlayedPlace as jest.Mock;
const RANGE = { chapterId: 2, fromVerseId: 9, toVerseId: 10 };

function Probe({ ready = true }: { ready?: boolean }) {
  usePlaybackReadingPlace(ready);
  return null;
}

beforeEach(() => {
  jest.clearAllMocks();
  usePlayerStore.setState({ ...initialPlayerState });
});

describe('usePlaybackReadingPlace', () => {
  it('writes the recited ayah as the reading place for a normal play', async () => {
    await renderUi(<Probe />);

    await act(async () => {
      usePlayerStore.setState({ status: 'playing', chapterId: 2, activeVerseId: 9 });
    });

    expect(mockWrite).toHaveBeenCalledWith('2:2', 2);
  });

  it('does not write the reading place while a dua verse range plays', async () => {
    await renderUi(<Probe />);

    await act(async () => {
      usePlayerStore.setState({ status: 'playing', chapterId: 2, rangePlay: RANGE, activeVerseId: 9 });
    });
    await act(async () => {
      usePlayerStore.setState({ activeVerseId: 10 });
    });

    expect(mockWrite).not.toHaveBeenCalled();
  });

  it('does not write when the range starts, even while it loads', async () => {
    await renderUi(<Probe />);

    await act(async () => {
      usePlayerStore.setState({ status: 'loading', chapterId: 2, rangePlay: RANGE, activeVerseId: 9 });
    });

    expect(mockWrite).not.toHaveBeenCalled();
  });

  it('writes again once a normal play follows a range play', async () => {
    await renderUi(<Probe />);
    await act(async () => {
      usePlayerStore.setState({ status: 'playing', chapterId: 2, rangePlay: RANGE, activeVerseId: 9 });
    });

    await act(async () => {
      usePlayerStore.setState({ rangePlay: null, activeVerseId: 10 });
    });

    expect(mockWrite).toHaveBeenCalledWith('2:3', 2);
  });

  it('writes nothing before the content database is ready', async () => {
    await renderUi(<Probe ready={false} />);

    await act(async () => {
      usePlayerStore.setState({ status: 'playing', chapterId: 2, activeVerseId: 9 });
    });

    expect(mockWrite).not.toHaveBeenCalled();
  });
});
