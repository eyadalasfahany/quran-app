import { act, fireEvent, screen } from '@testing-library/react-native';
import { View, Text } from 'react-native';
import { renderUi } from '../../../../jest/render-ui';
import { useBoxFollow, type BoxFollowOptions } from './useBoxFollow';



// Placeholder geometry only. A 400-high viewport; the page's top edge at screen 0 unless a test moves it.
const base: Omit<BoxFollowOptions, 'lineKey'> = {
  bottomInset: 0,
  currentOffset: () => 0,
  fallbackHeight: 400,
  following: true,
  line: { y0: 500, y1: 520 },
  pageTop: () => 0,
  reduceMotion: false,
  scale: 1,
  scrollTo: jest.fn(),
};

function Probe(props: BoxFollowOptions) {
  const follow = useBoxFollow(props);
  return <View {...follow.viewportProps} testID="viewport"><Text>probe</Text></View>;
}

async function mount(overrides: Partial<BoxFollowOptions>) {
  const scrollTo = jest.fn();
  const view = await renderUi(<Probe {...base} lineKey="1:1:1" scrollTo={scrollTo} {...overrides} />);
  return { scrollTo, view };
}

describe('useBoxFollow', () => {
  it('scrolls the line a third down when it has left the comfort band', async () => {
    const { scrollTo } = await mount({});
    // The line top is 500; a third of 400 is 133, so the target is 367 from the current offset (0).
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo.mock.calls[0]![0]).toBeCloseTo(500 - 400 / 3, 6);
    expect(scrollTo.mock.calls[0]![1]).toBe(true);
  });

  it('does not scroll while the line is inside the band', async () => {
    const { scrollTo } = await mount({ line: { y0: 100, y1: 120 } });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('never scrolls when the reader is not following, or there is no line', async () => {
    expect((await mount({ following: false })).scrollTo).not.toHaveBeenCalled();
    expect((await mount({ line: null })).scrollTo).not.toHaveBeenCalled();
  });

  it('does not scroll when the page is not laid out yet', async () => {
    expect((await mount({ pageTop: () => null })).scrollTo).not.toHaveBeenCalled();
  });

  it('does not animate under Reduce Motion', async () => {
    const { scrollTo } = await mount({ reduceMotion: true });
    expect(scrollTo.mock.calls[0]![1]).toBe(false);
  });

  it('checks again when the viewport is laid out', async () => {
    const scrollTo = jest.fn();
    await renderUi(<Probe {...base} lineKey="1:1:1" line={{ y0: 100, y1: 120 }} scrollTo={scrollTo} fallbackHeight={0} />);
    expect(scrollTo).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent(screen.getByTestId('viewport'), 'layout', { nativeEvent: { layout: { height: 100 } } });
    });
    // With a 100-high viewport the same line (top 100) is below the band (bottom 80 + …): it scrolls.
    expect(scrollTo).toHaveBeenCalled();
  });
});
