import { act, screen } from '@testing-library/react-native';
import { useContext } from 'react';
import { Text } from 'react-native';
import { usePinchGesture } from 'react-native-gesture-handler';

import { storage, storageKeys } from '@/core/storage/mmkv';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { resetReaderSettingsStore, useReaderSettings } from '../settings';

import { MushafPinch, MushafPinchContext } from './MushafPinch';

// The pinch is the real gesture; the test drives the callbacks the component hands it.
jest.mock('react-native-gesture-handler', () => {
  const actual = jest.requireActual<typeof import('react-native-gesture-handler')>('react-native-gesture-handler');
  return { ...actual, usePinchGesture: jest.fn(actual.usePinchGesture) };
});

function pinchConfig() {
  const config = jest.mocked(usePinchGesture).mock.lastCall?.[0];
  if (config?.onActivate === undefined || typeof config.onUpdate !== 'function') {
    throw new Error('MushafPinch gives the pinch no callbacks');
  }
  return config as { onActivate: (event: never) => void; onUpdate: (event: never) => void; runOnJS?: boolean };
}

// A pinch that starts, then moves through the given scales.
async function pinch(...scales: number[]) {
  const config = pinchConfig();
  await act(async () => {
    config.onActivate({ scale: 1 } as never);
    for (const scale of scales) {
      config.onUpdate({ scale } as never);
    }
  });
}

function PinchProbe() {
  const gesture = useContext(MushafPinchContext);
  return <Text accessibilityLabel="probe">{gesture === null ? 'none' : 'pinch'}</Text>;
}

describe('MushafPinch', () => {
  beforeEach(() => {
    storage.remove(storageKeys.readerSettings);
    resetReaderSettingsStore();
    jest.mocked(usePinchGesture).mockClear();
  });

  it.each(locales)('renders its content and hands the pinch to it (%s)', async (locale) => {
    await renderUi(
      <MushafPinch maxScale={1.6}>
        <PinchProbe />
      </MushafPinch>,
      { locale },
    );
    expect(screen.getByLabelText('probe')).toHaveTextContent('pinch');
  });

  it('runs on the JS thread, since it only sets the size', async () => {
    await renderUi(<MushafPinch maxScale={1.6}>{null}</MushafPinch>);
    expect(pinchConfig().runOnJS).toBe(true);
  });

  it('steps the reader text size from the size the pinch began at', async () => {
    useReaderSettings.getState().setFontScale(1.2);
    await renderUi(<MushafPinch maxScale={1.6}>{null}</MushafPinch>);

    await pinch(1.25);
    expect(useReaderSettings.getState().fontScale).toBe(1.5);

    await pinch(0.5);
    expect(useReaderSettings.getState().fontScale).toBe(0.8);
  });

  it('commits only when the snapped size changes', async () => {
    await renderUi(<MushafPinch maxScale={1.6}>{null}</MushafPinch>);
    const commits: number[] = [];
    const unsubscribe = useReaderSettings.subscribe((state) => commits.push(state.fontScale));

    await pinch(1.01, 1.02, 1.03, 1.06, 1.07, 1.08, 1.12, 1.2);
    unsubscribe();
    expect(commits).toEqual([1.1, 1.2]);
  });

  it('stops at its cap: another riwayah’s pages do not grow past 1×', async () => {
    await renderUi(<MushafPinch maxScale={1}>{null}</MushafPinch>);
    await pinch(1.5);
    expect(useReaderSettings.getState().fontScale).toBe(1);
    await pinch(0.88);
    expect(useReaderSettings.getState().fontScale).toBe(0.9);
  });

  it('adds no accessibility element of its own; the font sizer stays the accessible way to resize', async () => {
    await renderUi(
      <MushafPinch maxScale={1.6}>
        <PinchProbe />
      </MushafPinch>,
    );
    expect(screen.queryAllByRole('adjustable')).toHaveLength(0);
    expect(screen.getByLabelText('probe')).toBeOnTheScreen();
  });

  it('uses no raw colours', () => {
    expect(featureComponentLiterals('features/reader/components/MushafPinch.tsx')).toEqual([]);
  });
});
