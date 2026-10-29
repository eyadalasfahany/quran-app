// A stand-in for expo-audio's AudioPlaylist, used by jest.setup.ts. Tests drive it with emitStatus() and
// emitTrackChanged(). skipTo, next and previous emit trackChanged synchronously, as the native playlist does.
export type FakeAudioPlaylistStatus = {
  id: string;
  currentIndex: number;
  trackCount: number;
  currentTime: number;
  duration: number;
  playing: boolean;
  isBuffering: boolean;
  isLoaded: boolean;
  playbackRate: number;
  muted: boolean;
  volume: number;
  loop: 'none' | 'single' | 'all';
  didJustFinish: boolean;
};

export type FakeAudioPlaylistSource = { uri?: string; name?: string };

export type FakeAudioPlaylist = {
  id: string;
  currentIndex: number;
  readonly trackCount: number;
  readonly sources: FakeAudioPlaylistSource[];
  playing: boolean;
  isLoaded: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  muted: boolean;
  addListener: jest.Mock;
  play: jest.Mock;
  pause: jest.Mock;
  next: jest.Mock;
  previous: jest.Mock;
  skipTo: jest.Mock;
  seekTo: jest.Mock;
  add: jest.Mock;
  insert: jest.Mock;
  remove: jest.Mock;
  clear: jest.Mock;
  setActiveForLockScreen: jest.Mock;
  updateLockScreenMetadata: jest.Mock;
  clearLockScreenControls: jest.Mock;
  destroy: jest.Mock;
  emitStatus: (status?: Partial<FakeAudioPlaylistStatus>) => void;
  /** Moves to `currentIndex` the way the native playlist does when a track changes, and emits trackChanged. */
  emitTrackChanged: (currentIndex: number) => void;
  listenerCount: (event: string) => number;
};

export function createFakeAudioPlaylist(sources: FakeAudioPlaylistSource[] = []): FakeAudioPlaylist {
  const listeners = new Map<string, Set<(payload: never) => void>>();
  const emit = (event: string, payload: unknown) => {
    for (const listener of [...(listeners.get(event) ?? [])]) {
      (listener as (value: unknown) => void)(payload);
    }
  };
  const move = (index: number) => {
    if (index < 0 || index >= playlist.trackCount || index === playlist.currentIndex) {
      return;
    }
    const previousIndex = playlist.currentIndex;
    playlist.currentIndex = index;
    playlist.isLoaded = false;
    emit('trackChanged', { previousIndex, currentIndex: index });
  };

  const playlist: FakeAudioPlaylist = {
    id: 'fake-playlist',
    currentIndex: 0,
    trackCount: sources.length,
    sources,
    playing: false,
    isLoaded: false,
    isBuffering: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1,
    volume: 1,
    muted: false,
    addListener: jest.fn((event: string, listener: (payload: never) => void) => {
      const set = listeners.get(event) ?? new Set<(payload: never) => void>();
      set.add(listener);
      listeners.set(event, set);
      return { remove: jest.fn(() => set.delete(listener)) };
    }),
    play: jest.fn(),
    pause: jest.fn(),
    next: jest.fn(() => move(playlist.currentIndex + 1)),
    previous: jest.fn(() => move(playlist.currentIndex - 1)),
    skipTo: jest.fn((index: number) => move(index)),
    seekTo: jest.fn(() => Promise.resolve()),
    add: jest.fn(),
    insert: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
    setActiveForLockScreen: jest.fn(),
    updateLockScreenMetadata: jest.fn(),
    clearLockScreenControls: jest.fn(),
    destroy: jest.fn(),
    emitStatus: (status = {}) => {
      const full: FakeAudioPlaylistStatus = {
        id: playlist.id,
        currentIndex: playlist.currentIndex,
        trackCount: playlist.trackCount,
        currentTime: 0,
        duration: 0,
        playing: false,
        isBuffering: false,
        isLoaded: false,
        playbackRate: playlist.playbackRate,
        muted: false,
        volume: 1,
        loop: 'none',
        didJustFinish: false,
        ...status,
      };
      emit('playlistStatusUpdate', full);
    },
    emitTrackChanged: (currentIndex) => {
      move(currentIndex);
    },
    listenerCount: (event) => listeners.get(event)?.size ?? 0,
  };
  return playlist;
}
