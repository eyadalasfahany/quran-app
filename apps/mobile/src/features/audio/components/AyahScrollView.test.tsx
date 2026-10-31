import { fireEvent } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Text } from 'react-native';
import { useNativeGesture } from 'react-native-gesture-handler';

import { locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { AyahScrollView } from './AyahScrollView';
import { PlayerHost } from './PlayerHost';
import { usePlayerHost, type PlayerHostValue } from './player-host-context';

// The native gesture is captured, not run: the test reads the arguments it was given, the wiring to the host's pan.
jest.mock('react-native-gesture-handler', () => {
  const actual = jest.requireActual<typeof import('react-native-gesture-handler')>('react-native-gesture-handler');
  return {
    ...actual,
    GestureDetector: ({ children }: { children: unknown }) => children,
    useNativeGesture: jest.fn(() => ({})),
  };
});

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

// The host the probe sits in, captured from an effect so the test can read the host's shared values.
const probe: { host: PlayerHostValue | null } = { host: null };

function HostProbe() {
  const value = usePlayerHost();
  useEffect(() => {
    probe.host = value;
  }, [value]);
  return null;
}

beforeEach(() => {
  probe.host = null;
  jest.mocked(useNativeGesture).mockClear();
});

describe('AyahScrollView', () => {
  it.each(locales)('passes its props and content through inside the player, in %s', async (locale) => {
    const view = await renderUi(
      <PlayerHost>
        <AyahScrollView testID="scroll">
          <Text>الآية</Text>
        </AyahScrollView>
      </PlayerHost>,
      { locale },
    );

    expect(view.getByTestId('scroll').props.scrollEventThrottle).toBe(16);
    expect(view.getByText('الآية')).toBeOnTheScreen();
  });

  it('does not bounce, so a downward drag at the top moves the player instead', async () => {
    const view = await renderUi(
      <PlayerHost>
        <AyahScrollView testID="scroll">
          <Text>content</Text>
        </AyahScrollView>
      </PlayerHost>,
      { locale: 'en' },
    );

    expect(view.getByTestId('scroll').props.bounces).toBe(false);
  });

  it('runs its native gesture alongside the host pan, so the drag hand-off works as in PlayerScrollView', async () => {
    await renderUi(
      <PlayerHost>
        <HostProbe />
        <AyahScrollView testID="scroll">
          <Text>content</Text>
        </AyahScrollView>
      </PlayerHost>,
      { locale: 'en' },
    );

    expect(useNativeGesture).toHaveBeenCalledWith(expect.objectContaining({ simultaneousWith: probe.host?.panGesture }));
    expect(probe.host?.panGesture).toBeDefined();
  });

  it('marks the touch as on the scrolling content from the start of a touch until its end', async () => {
    await renderUi(
      <PlayerHost>
        <HostProbe />
        <AyahScrollView testID="scroll">
          <Text>content</Text>
        </AyahScrollView>
      </PlayerHost>,
      { locale: 'en' },
    );
    const config = jest.mocked(useNativeGesture).mock.calls[0]![0] as { onBegin: () => void; onFinalize: () => void };

    config.onBegin();
    expect(probe.host?.scrollTouched.value).toBe(true);
    config.onFinalize();
    expect(probe.host?.scrollTouched.value).toBe(false);
  });

  it('records its scroll offset on the host, and passes the scroll on to the caller', async () => {
    const onScroll = jest.fn();
    const view = await renderUi(
      <PlayerHost>
        <HostProbe />
        <AyahScrollView onScroll={onScroll} testID="scroll">
          <Text>content</Text>
        </AyahScrollView>
      </PlayerHost>,
      { locale: 'en' },
    );

    fireEvent.scroll(view.getByTestId('scroll'), { nativeEvent: { contentOffset: { y: 40 } } });
    expect(probe.host?.scrollOffset.value).toBe(40);
    expect(onScroll).toHaveBeenCalledTimes(1);
  });

  it('is a plain scroll view outside a player, with no gesture to wire', async () => {
    const view = await renderUi(
      <AyahScrollView testID="scroll">
        <Text>content</Text>
      </AyahScrollView>,
      { locale: 'en' },
    );

    expect(view.getByTestId('scroll').props.bounces).toBe(false);
    expect(view.getByTestId('scroll').props.showsVerticalScrollIndicator).toBe(false);
    expect(useNativeGesture).not.toHaveBeenCalled();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/AyahScrollView.tsx')).toEqual([]);
  });
});
