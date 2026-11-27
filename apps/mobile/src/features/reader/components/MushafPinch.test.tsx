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
      <MushafPinch zoomAvailable>
        <PinchProbe />
      </MushafPinch>,
      { locale },
    );
    expect(screen.getByLabelText('probe')).toHaveTextContent('pinch');
  });

  it('runs on the JS thread, since it only sets the zoom', async () => {
    await renderUi(<MushafPinch zoomAvailable>{null}</MushafPinch>);
    expect(pinchConfig().runOnJS).toBe(true);
  });

  it('steps the page zoom in 25% steps from the zoom the pinch began at', async () => {
    useReaderSettings.getState().setMushafZoom(1.25);
    await renderUi(<MushafPinch zoomAvailable>{null}</MushafPinch>);

    await pinch(1.25);
    expect(useReaderSettings.getState().mushafZoom).toBe(1.5);

    await pinch(0.5);
    expect(useReaderSettings.getState().mushafZoom).toBe(1);
  });

  it('commits only when the snapped zoom changes', async () => {
    await renderUi(<MushafPinch zoomAvailable>{null}</MushafPinch>);
    const commits: number[] = [];
    const unsubscribe = useReaderSettings.subscribe((state) => commits.push(state.mushafZoom));

    await pinch(1.05, 1.1, 1.2, 1.3, 1.4, 1.6);
    unsubscribe();
    expect(commits).toEqual([1.25, 1.5]);
  });

  it('stops at 300%', async () => {
    await renderUi(<MushafPinch zoomAvailable>{null}</MushafPinch>);
    await pinch(4);
    expect(useReaderSettings.getState().mushafZoom).toBe(3);
  });

  it('does nothing where zoom is not available (a riwayah without word data)', async () => {
    await renderUi(<MushafPinch zoomAvailable={false}>{null}</MushafPinch>);
    const commits: number[] = [];
    const unsubscribe = useReaderSettings.subscribe((state) => commits.push(state.mushafZoom));

    await pinch(1.5);
    unsubscribe();
    expect(commits).toEqual([]);
    expect(useReaderSettings.getState().mushafZoom).toBe(1);
  });

  it('adds no accessibility element of its own; the zoom stepper stays the accessible way to zoom', async () => {
    await renderUi(
      <MushafPinch zoomAvailable>
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
