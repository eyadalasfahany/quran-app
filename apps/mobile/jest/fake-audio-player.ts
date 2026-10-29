// A stand-in for expo-audio's AudioPlayer, used by jest.setup.ts. Tests drive it with emitStatus().
export type FakeAudioPlayer = {
  id: string;
  currentTime: number;
  duration: number;
  playing: boolean;
  isLoaded: boolean;
  addListener: jest.Mock;
  play: jest.Mock;
  pause: jest.Mock;
  replace: jest.Mock;
  seekTo: jest.Mock;
  setActiveForLockScreen: jest.Mock;
  updateLockScreenMetadata: jest.Mock;
  clearLockScreenControls: jest.Mock;
  remove: jest.Mock;
  emitStatus: (status: Partial<FakeAudioStatus>) => void;
};

export type FakeAudioStatus = {
  id: string;
  currentTime: number;
  duration: number;
  playing: boolean;
  isLoaded: boolean;
  isBuffering: boolean;
  didJustFinish: boolean;
  error: string | null;
};

export function createFakeAudioPlayer(): FakeAudioPlayer {
  const listeners: ((status: FakeAudioStatus) => void)[] = [];
  return {
    id: 'fake-player',
    currentTime: 0,
    duration: 0,
    playing: false,
    isLoaded: false,
    addListener: jest.fn((_event: string, listener: (status: FakeAudioStatus) => void) => {
      listeners.push(listener);
      return { remove: jest.fn() };
    }),
    play: jest.fn(),
    pause: jest.fn(),
    replace: jest.fn(),
    seekTo: jest.fn(() => Promise.resolve()),
    setActiveForLockScreen: jest.fn(),
    updateLockScreenMetadata: jest.fn(),
    clearLockScreenControls: jest.fn(),
    remove: jest.fn(),
    emitStatus: (status) => {
      const full: FakeAudioStatus = {
        id: 'fake-player',
        currentTime: 0,
        duration: 0,
        playing: false,
        isLoaded: false,
        isBuffering: false,
        didJustFinish: false,
        error: null,
        ...status,
      };
      for (const listener of listeners) {
        listener(full);
      }
    },
  };
}
