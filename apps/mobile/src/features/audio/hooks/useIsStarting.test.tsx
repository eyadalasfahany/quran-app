import { act } from '@testing-library/react-native';
import { Text } from 'react-native';

import { renderUi } from '../../../../jest/render-ui';

import { initialPlayerState, usePlayerStore, type PlayTarget } from '../playerStore';

import {
  isStartingFor,
  listenMatch,
  reciterMatch,
  surahMatch,
  useIsStarting,
  verseMatch,
  type StartState,
} from './useIsStarting';

const idle: StartState = { chapterId: null, reciterId: null, startingTarget: null, status: 'idle' };
const verse: PlayTarget = { kind: 'verse', verseKey: '2:255' };
const reciter: PlayTarget = { kind: 'reciter', resourceId: 7 };
const surah: PlayTarget = { kind: 'surah', resourceId: 7, chapterId: 2 };
const listen: PlayTarget = { kind: 'listen', resourceId: 7, chapterId: 2 };

describe('isStartingFor', () => {
  it('counts any start when no match is given', () => {
    expect(isStartingFor({ ...idle, startingTarget: verse })).toBe(true);
    expect(isStartingFor({ ...idle, status: 'loading' })).toBe(true);
    expect(isStartingFor(idle)).toBe(false);
    expect(isStartingFor({ ...idle, status: 'playing' })).toBe(false);
  });

  it('is true only for its own verse', () => {
    const match = verseMatch('2:255');

    expect(isStartingFor({ ...idle, startingTarget: verse }, match)).toBe(true);
    expect(isStartingFor({ ...idle, startingTarget: { kind: 'verse', verseKey: '2:256' } }, match)).toBe(false);
    expect(isStartingFor({ ...idle, startingTarget: reciter }, match)).toBe(false);
  });

  it('never matches a null verse key', () => {
    expect(isStartingFor({ ...idle, startingTarget: verse }, verseMatch(null))).toBe(false);
  });

  it('is true for its own reciter, and while that reciter loads', () => {
    const match = reciterMatch(7);

    expect(isStartingFor({ ...idle, startingTarget: reciter }, match)).toBe(true);
    expect(isStartingFor({ ...idle, reciterId: 7, status: 'loading' }, match)).toBe(true);
    expect(isStartingFor({ ...idle, reciterId: 8, status: 'loading' }, match)).toBe(false);
    expect(isStartingFor({ ...idle, startingTarget: { kind: 'reciter', resourceId: 8 } }, match)).toBe(false);
  });

  it('does not fall back to the loaded item when the status is not loading', () => {
    expect(isStartingFor({ ...idle, reciterId: 7, status: 'playing' }, reciterMatch(7))).toBe(false);
    expect(isStartingFor({ ...idle, reciterId: 7, status: 'paused' }, reciterMatch(7))).toBe(false);
  });

  it('is true for its own surah, and while that surah loads', () => {
    const match = surahMatch(7, 2);

    expect(isStartingFor({ ...idle, startingTarget: surah }, match)).toBe(true);
    expect(isStartingFor({ ...idle, reciterId: 7, chapterId: 2, status: 'loading' }, match)).toBe(true);
    expect(isStartingFor({ ...idle, reciterId: 7, chapterId: 3, status: 'loading' }, match)).toBe(false);
    expect(isStartingFor({ ...idle, startingTarget: listen }, match)).toBe(false);
  });

  it('is true for its own listen, and while that listen loads', () => {
    const match = listenMatch(7, 2);

    expect(isStartingFor({ ...idle, startingTarget: listen }, match)).toBe(true);
    expect(isStartingFor({ ...idle, reciterId: 7, chapterId: 2, status: 'loading' }, match)).toBe(true);
    expect(isStartingFor({ ...idle, startingTarget: surah }, match)).toBe(false);
  });
});

function Probe({ match }: { match?: Parameters<typeof useIsStarting>[0] }) {
  return <Text>{useIsStarting(match) ? 'starting' : 'idle'}</Text>;
}

describe('useIsStarting', () => {
  beforeEach(async () => {
    await act(async () => {
      usePlayerStore.setState({ ...initialPlayerState });
    });
  });

  it('follows the store: a tap starts, and playing clears it', async () => {
    const view = await renderUi(<Probe match={verseMatch('2:255')} />);
    expect(await view.findByText('idle')).toBeTruthy();

    await act(async () => {
      usePlayerStore.getState().beginStarting(verse);
    });
    expect(view.getByText('starting')).toBeTruthy();

    await act(async () => {
      usePlayerStore.getState().markPlaying();
    });
    expect(view.getByText('idle')).toBeTruthy();
  });

  it('reports any start without a match', async () => {
    const view = await renderUi(<Probe />);
    expect(await view.findByText('idle')).toBeTruthy();

    await act(async () => {
      usePlayerStore.getState().beginStarting(reciter);
    });
    expect(view.getByText('starting')).toBeTruthy();
  });
});
