import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

import { measureInViewport } from './measure-in-viewport';
import { useWordFollow, WORD_SETTLE_MS } from './useWordFollow';

// The native measurement of the followed Text inside the viewport: each test sets where the Text sits.
jest.mock('./measure-in-viewport', () => ({ measureInViewport: jest.fn() }));

const LINES = [
  { height: 50, text: 'first line ', y: 0 },
  { height: 50, text: 'second line', y: 50 },
];
const VIEWPORT_HEIGHT = 600;

type Harness = {
  following: boolean;
  textKey: string | null;
  offset: number | null;
  bottomInset?: number;
  fallbackHeight?: number;
  currentOffset?: number;
  reduceMotion?: boolean;
};

// One viewport and one followed Text. The lines are reported through onTextLayout, as the native layout does.
function Follow({
  scrolls,
  options,
  textKey,
  settling = false,
}: {
  scrolls: { offset: number; animated: boolean }[];
  options: Harness;
  textKey: string;
  /** An ayah-level scroll began on mount, as the list's own follow does. */
  settling?: boolean;
}) {
  const { bottomInset = 0, currentOffset = 0, fallbackHeight = 0, reduceMotion = false } = options;
  const follow = useWordFollow({
    bottomInset,
    currentOffset: () => currentOffset,
    fallbackHeight,
    following: options.following,
    offset: options.offset,
    reduceMotion,
    scrollTo: (offset, animated) => scrolls.push({ animated, offset }),
    textKey: options.textKey,
  });
  useEffect(() => {
    if (settling) {
      follow.noteScroll(true);
    }
  }, [follow, settling]);
  return (
    <View {...follow.viewportProps} testID="viewport">
      <Text {...follow.textProps(textKey)} testID="text">
        text
      </Text>
    </View>
  );
}

async function mountFollow(options: Harness, textKey = 'verse', settling = false) {
  const scrolls: { offset: number; animated: boolean }[] = [];
  const view = await render(<Follow options={options} scrolls={scrolls} settling={settling} textKey={textKey} />);
  return { scrolls, view };
}

type Mounted = Awaited<ReturnType<typeof render>>;

async function reportLines(view: Mounted, lines = LINES) {
  await fireEvent(view.getByTestId('text'), 'textLayout', { nativeEvent: { lines } });
}

// Waits out the settle window (the check waits WORD_SETTLE_MS after an ayah scroll), then the word check runs.
async function settle(ms = WORD_SETTLE_MS + 50) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

describe('useWordFollow', () => {
  beforeEach(() => {
    jest.mocked(measureInViewport).mockReset();
  });

  afterEach(async () => {
    await cleanup();
  });

  // The word is on the second line (offset 12), and the Text sits `top` down the viewport.
  function placeText(top: number) {
    jest.mocked(measureInViewport).mockImplementation((_node, _viewport, onMeasured) => onMeasured(top));
  }
  const base: Harness = { following: true, fallbackHeight: VIEWPORT_HEIGHT, offset: 12, textKey: 'verse' };

  it('scrolls the word line to a third down when it has left the band', async () => {
    placeText(500); // the second line sits at 550, below the band (120 to 480)
    const { scrolls, view } = await mountFollow({ ...base, currentOffset: 100 });
    await reportLines(view);
    await settle();
    expect(scrolls).toEqual([{ animated: true, offset: 100 + (550 - VIEWPORT_HEIGHT / 3) }]);
  });

  it('does nothing while the word line is inside the band', async () => {
    placeText(200); // the second line sits at 250, inside the band
    const { scrolls, view } = await mountFollow(base);
    await reportLines(view);
    await settle();
    expect(scrolls).toEqual([]);
  });

  it('does nothing when the reader is not following', async () => {
    placeText(500);
    const { scrolls, view } = await mountFollow({ ...base, following: false });
    await reportLines(view);
    await settle();
    expect(scrolls).toEqual([]);
  });

  it('does nothing when the offset is past the lines', async () => {
    placeText(500);
    const { scrolls, view } = await mountFollow({ ...base, offset: 999 });
    await reportLines(view);
    await settle();
    expect(scrolls).toEqual([]);
  });

  it('ignores lines laid out for another text', async () => {
    placeText(500);
    const scrolls: { offset: number; animated: boolean }[] = [];
    const view = await render(<Follow options={{ ...base, textKey: 'other' }} scrolls={scrolls} textKey="verse" />);
    await reportLines(view);
    await settle();
    expect(scrolls).toEqual([]);
  });

  it('waits for an ayah scroll to settle before it checks the word', async () => {
    placeText(500);
    const { scrolls, view } = await mountFollow(base, 'verse', true);
    // The lines arrive during the settle: nothing scrolls until the window has passed.
    await reportLines(view);
    await settle(100);
    expect(scrolls).toEqual([]);
    await settle();
    expect(scrolls).toHaveLength(1);
  });

  it('jumps without waiting or animating under Reduce Motion', async () => {
    placeText(500);
    const { scrolls, view } = await mountFollow({ ...base, currentOffset: 0, reduceMotion: true });
    await reportLines(view);
    expect(scrolls).toEqual([{ animated: false, offset: 550 - VIEWPORT_HEIGHT / 3 }]);
  });

  it('never scrolls above the top', async () => {
    placeText(0); // the line sits at the top, above the band: the change is negative, from offset 0
    const { scrolls, view } = await mountFollow({ ...base, currentOffset: 0, reduceMotion: true, offset: 1 });
    await reportLines(view, [
      { height: 50, text: 'x', y: 0 },
      { height: 50, text: 'yz', y: 50 },
    ]);
    expect(scrolls).toEqual([]);
  });

  it('does nothing before the viewport has a height', async () => {
    placeText(500);
    const { scrolls, view } = await mountFollow({ ...base, fallbackHeight: 0 });
    await reportLines(view);
    expect(scrolls).toEqual([]);
  });
});
