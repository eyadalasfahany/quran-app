import { screen } from '@testing-library/react-native';
import { createRef } from 'react';
import { Text, type ScrollViewInstance } from 'react-native';
import { useNativeGesture, usePinchGesture } from 'react-native-gesture-handler';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { MushafPinch } from './MushafPinch';
import { MushafScrollView } from './MushafScrollView';

jest.mock('react-native-gesture-handler', () => {
  const actual = jest.requireActual<typeof import('react-native-gesture-handler')>('react-native-gesture-handler');
  return {
    ...actual,
    useNativeGesture: jest.fn(actual.useNativeGesture),
    usePinchGesture: jest.fn(actual.usePinchGesture),
  };
});

describe('MushafScrollView', () => {
  beforeEach(() => {
    jest.mocked(useNativeGesture).mockClear();
    jest.mocked(usePinchGesture).mockClear();
  });

  it.each(locales)('renders the scroll view with its content and props, and forwards its ref (%s)', async (locale) => {
    const ref = createRef<ScrollViewInstance>();
    await renderUi(
      <MushafScrollView ref={ref} showsVerticalScrollIndicator={false} testID="scroll">
        <Text>FIXTURE row</Text>
      </MushafScrollView>,
      { locale },
    );
    expect(screen.getByTestId('scroll').props.showsVerticalScrollIndicator).toBe(false);
    expect(screen.getByText('FIXTURE row')).toBeOnTheScreen();
    expect(ref.current).not.toBeNull();
  });

  it('outside a Mushaf pinch, has no pinch to run alongside', async () => {
    await renderUi(<MushafScrollView testID="scroll" />);
    expect(jest.mocked(useNativeGesture).mock.lastCall?.[0]?.simultaneousWith).toBeUndefined();
  });

  it('inside a Mushaf pinch, its native scroll runs alongside the pinch, so one finger still scrolls', async () => {
    await renderUi(
      <MushafPinch maxScale={1.6}>
        <MushafScrollView testID="scroll" />
      </MushafPinch>,
    );
    const pinch = jest.mocked(usePinchGesture).mock.results.at(-1)?.value;
    expect(pinch).toBeDefined();
    expect(jest.mocked(useNativeGesture).mock.lastCall?.[0]?.simultaneousWith).toBe(pinch);
    expect(screen.getByTestId('scroll')).toBeOnTheScreen();
  });

  it('keeps the scroll view accessible as it is: no role or label of its own', async () => {
    await renderUi(<MushafScrollView testID="scroll" />);
    expect(screen.getByTestId('scroll').props.accessibilityRole).toBeUndefined();
    expect(screen.getByTestId('scroll').props.accessibilityLabel).toBeUndefined();
  });

  it('uses no raw colours', () => {
    expect(featureComponentLiterals('features/reader/components/MushafScrollView.tsx')).toEqual([]);
  });
});
