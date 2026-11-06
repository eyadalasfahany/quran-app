import { act, renderHook } from '@testing-library/react-native';
import { BackHandler } from 'react-native';

import { setAndroidNavigationBarHidden } from './android-navigation-bar';
import { useMushafFullscreen } from './useMushafFullscreen';

jest.mock('./android-navigation-bar', () => ({ setAndroidNavigationBarHidden: jest.fn() }));

describe('useMushafFullscreen', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts out of full screen', async () => {
    const { result } = await renderHook(() => useMushafFullscreen('mushaf'));

    expect(result.current.fullscreen).toBe(false);
  });

  it('enters and exits full screen', async () => {
    const { result } = await renderHook(() => useMushafFullscreen('mushaf'));

    await act(async () => {
      result.current.enter();
    });
    expect(result.current.fullscreen).toBe(true);

    await act(async () => {
      result.current.exit();
    });
    expect(result.current.fullscreen).toBe(false);
  });

  it('ends when the reader leaves Mushaf, and returning to Mushaf does not re-enter', async () => {
    const { result, rerender } = await renderHook(
      ({ mode }: { mode: 'mushaf' | 'reading' }) => useMushafFullscreen(mode),
      { initialProps: { mode: 'mushaf' } },
    );
    await act(async () => {
      result.current.enter();
    });
    expect(result.current.fullscreen).toBe(true);

    await act(async () => {
      rerender({ mode: 'reading' });
    });
    expect(result.current.fullscreen).toBe(false);

    await act(async () => {
      rerender({ mode: 'mushaf' });
    });
    expect(result.current.fullscreen).toBe(false);
  });

  it('exits on the hardware back press and returns true to stop the system back action', async () => {
    let handler: (() => boolean) | undefined;
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_name, listener) => {
      handler = listener as () => boolean;
      return { remove: jest.fn() } as unknown as ReturnType<typeof BackHandler.addEventListener>;
    });
    const { result } = await renderHook(() => useMushafFullscreen('mushaf'));
    await act(async () => {
      result.current.enter();
    });

    let handled: boolean | undefined;
    await act(async () => {
      handled = handler?.();
    });

    expect(handled).toBe(true);
    expect(result.current.fullscreen).toBe(false);
  });

  it('registers no back listener when not in full screen', async () => {
    const add = jest.spyOn(BackHandler, 'addEventListener');
    await renderHook(() => useMushafFullscreen('mushaf'));

    expect(add).not.toHaveBeenCalledWith('hardwareBackPress', expect.any(Function));
  });

  it('removes the back listener on exit', async () => {
    const remove = jest.fn();
    const add = jest.spyOn(BackHandler, 'addEventListener').mockImplementation(
      () => ({ remove }) as unknown as ReturnType<typeof BackHandler.addEventListener>,
    );
    const { result } = await renderHook(() => useMushafFullscreen('mushaf'));
    await act(async () => {
      result.current.enter();
    });
    expect(add).toHaveBeenCalledWith('hardwareBackPress', expect.any(Function));
    expect(remove).not.toHaveBeenCalled();

    await act(async () => {
      result.current.exit();
    });

    expect(remove).toHaveBeenCalledTimes(1);
  });
});

describe('useMushafFullscreen Android navigation bar', () => {
  const setBar = jest.mocked(setAndroidNavigationBarHidden);

  beforeEach(() => {
    setBar.mockClear();
  });

  it('hides the navigation bar on entering full screen', async () => {
    const { result } = await renderHook(() => useMushafFullscreen('mushaf'));

    await act(async () => {
      result.current.enter();
    });

    expect(setBar).toHaveBeenLastCalledWith(true);
    expect(setBar).not.toHaveBeenCalledWith(false);
  });

  it('shows the navigation bar on exiting full screen', async () => {
    const { result } = await renderHook(() => useMushafFullscreen('mushaf'));
    await act(async () => {
      result.current.enter();
    });

    await act(async () => {
      result.current.exit();
    });

    expect(setBar).toHaveBeenLastCalledWith(false);
  });

  it('shows the navigation bar when unmounted while in full screen', async () => {
    const { result, unmount } = await renderHook(() => useMushafFullscreen('mushaf'));
    await act(async () => {
      result.current.enter();
    });
    setBar.mockClear();

    await act(async () => {
      unmount();
    });

    expect(setBar).toHaveBeenCalledTimes(1);
    expect(setBar).toHaveBeenCalledWith(false);
  });

  it('calls nothing when full screen was never entered', async () => {
    const { unmount } = await renderHook(() => useMushafFullscreen('mushaf'));

    await act(async () => {
      unmount();
    });

    expect(setBar).not.toHaveBeenCalled();
  });
});
