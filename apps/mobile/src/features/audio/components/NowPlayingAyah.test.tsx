import { act, fireEvent, within } from '@testing-library/react-native';
import { ScrollView } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { ThemeProvider, themes } from '@/core/theme';

import { NowPlayingAyah, type AyahWord } from './NowPlayingAyah';

const colors = themes.dark.colors;
const words: AyahWord[] = [
  { text: 'إِيَّاكَ', state: 'recited' },
  { text: 'نَعْبُدُ', state: 'current' },
  { text: 'وَإِيَّاكَ', state: 'upcoming' },
];

describe('NowPlayingAyah', () => {
  it('colours recited words ink, the current word accent and upcoming words muted', async () => {
    const view = await renderUi(<NowPlayingAyah counter="الآية ٥ من ٧" label="إياك نعبد الآية ٥" words={words} />, { theme: 'dark' });

    expect(flatStyle(view.getByText('إِيَّاكَ').props.style).color).toBe(colors.playerInk);
    expect(flatStyle(view.getByText('نَعْبُدُ').props.style).color).toBe(colors.playerAccent);
    expect(flatStyle(view.getByText('وَإِيَّاكَ').props.style).color).toBe(colors.playerMuted);
  });

  it('keeps each stored word as given, and never truncates or scales the Quran text', async () => {
    const view = await renderUi(<NowPlayingAyah counter="c" label="l" words={words} />);
    const ayah = view.getByLabelText('l');

    expect(ayah.props.numberOfLines).toBeUndefined();
    expect(ayah.props.ellipsizeMode).toBeUndefined();
    expect(ayah.props.allowFontScaling).toBe(false);
    expect(view.getByText('نَعْبُدُ')).toBeOnTheScreen();
  });

  it('sets the accessibility label from the caller (Imla\'i text plus the ayah number)', async () => {
    const view = await renderUi(<NowPlayingAyah counter="c" label="إياك نعبد الآية ٥" words={words} />);

    expect(view.getByLabelText('إياك نعبد الآية ٥')).toBeOnTheScreen();
  });

  it.each(locales)('shows the counter line under the ayah (%s)', async (locale) => {
    const view = await renderUi(<NowPlayingAyah counter="الآية ٥ من ٧" label="l" words={words} />, { locale });

    expect(flatStyle(view.getByText('الآية ٥ من ٧').props.style).color).toBe(themes.light.colors.playerMuted);
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/NowPlayingAyah.tsx')).toEqual([]);
  });

  it('keeps the Quran text as stored, joined by single spaces, with nothing added or trimmed', async () => {
    const view = await renderUi(<NowPlayingAyah counter="c" label="l" words={words} />);

    expect(textOf(view.getByLabelText('l'))).toBe('إِيَّاكَ نَعْبُدُ وَإِيَّاكَ');
  });
});

const layoutOf = (height: number) => ({ nativeEvent: { layout: { height, width: 300, x: 0, y: 0 } } });
const followLines = [
  { height: 52.5, text: 'إِيَّاكَ ', y: 0 },
  { height: 52.5, text: 'نَعْبُدُ وَإِيَّاكَ', y: 250 },
];
const recitedWord = 2;

// The card's text and counter heights, as the Text and the counter report them.
async function renderCard(props: Partial<React.ComponentProps<typeof NowPlayingAyah>> = {}, textHeight = 80) {
  const view = await renderUi(
    <NowPlayingAyah counter="الآية ٥ من ٧" label="إياك نعبد" words={words} {...props} />,
    { theme: 'dark' },
  );
  await fireEvent(view.getByLabelText('إياك نعبد'), 'layout', layoutOf(textHeight));
  await fireEvent(view.getByTestId('now-playing-counter'), 'layout', layoutOf(16));
  return view;
}

// The jest preset gives every ScrollView instance one shared scrollTo mock on its prototype.
function scrollTo(_view?: unknown) {
  return (ScrollView.prototype as unknown as { scrollTo: jest.Mock }).scrollTo;
}

// The text under a node, as the Quran text would read to a reader.
type TextNode = { children: readonly (TextNode | string)[] };

function textOf(node: TextNode): string {
  return node.children.map((child) => (typeof child === 'string' ? child : textOf(child))).join('');
}

describe('NowPlayingAyah card', () => {
  it('scrolls the Quran text inside the card, and keeps the counter pinned outside the scroll', async () => {
    const view = await renderCard({ height: 200 });
    const scroll = view.getByTestId('now-playing-scroll');

    expect(within(scroll).getByLabelText('إياك نعبد')).toBeOnTheScreen();
    expect(within(scroll).queryByTestId('now-playing-counter')).toBeNull();
    expect(within(view.getByTestId('now-playing-ayah')).getByTestId('now-playing-counter')).toBeOnTheScreen();
  });

  it('is as tall as its text when no height is given', async () => {
    const view = await renderCard({}, 400);

    expect(flatStyle(view.getByTestId('now-playing-ayah').props.style).height).toBeUndefined();
    expect(flatStyle(view.getByTestId('now-playing-scroll').props.style).flexGrow).toBe(0);
  });

  it('takes the given height, and its text scrolls above the pinned counter when the text is taller', async () => {
    const view = await renderCard({ height: 200 }, 400);
    await fireEvent(view.getByTestId('now-playing-scroll'), 'layout', layoutOf(150));

    expect(flatStyle(view.getByTestId('now-playing-ayah').props.style)).toMatchObject({ height: 200 });
    expect(flatStyle(view.getByTestId('now-playing-scroll').props.style)).toMatchObject({ flexBasis: 0, flexGrow: 1, flexShrink: 1 });
    expect(view.getByTestId('now-playing-scroll').props.showsVerticalScrollIndicator).toBe(true);
    expect(view.getByTestId('now-playing-counter')).toBeOnTheScreen();
  });

  it('centres a short text vertically in the given height, and does not scroll it', async () => {
    const view = await renderCard({ height: 200 }, 80);
    await fireEvent(view.getByTestId('now-playing-scroll'), 'layout', layoutOf(150));
    const scroll = view.getByTestId('now-playing-scroll');

    expect(scroll.props.showsVerticalScrollIndicator).toBe(false);
    expect(flatStyle(scroll.props.contentContainerStyle)).toMatchObject({ alignItems: 'center', flexGrow: 1, justifyContent: 'center' });
  });

  it('keeps the card border and radius fixed around the scroll', async () => {
    const view = await renderCard({ height: 200 }, 400);

    expect(flatStyle(view.getByTestId('now-playing-ayah').props.style)).toMatchObject({ borderRadius: 20, paddingVertical: 14 });
  });
});

describe('NowPlayingAyah follow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    scrollTo().mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // A card that scrolls (text 400 pt in a 200 pt card) with a 300 pt viewport; the recited word is on the second line.
  async function renderFollowing(playing = true) {
    const view = await renderCard({ activeWord: recitedWord, height: 200, playing, words }, 400);
    await fireEvent(view.getByLabelText('إياك نعبد'), 'textLayout', { nativeEvent: { lines: followLines } });
    await fireEvent(view.getByTestId('now-playing-scroll'), 'layout', layoutOf(300));
    return view;
  }

  it('scrolls the recited word\'s line a third down the card when it leaves the comfort band', async () => {
    const view = await renderFollowing();

    // The second line sits at 250 pt; a third of the 300 pt viewport is 100 pt, so the line lands at 150.
    expect(scrollTo(view)).toHaveBeenLastCalledWith({ animated: true, y: 150 });
  });

  it('does not scroll while the recited line is already inside the band', async () => {
    const view = await renderUi(
      <NowPlayingAyah activeWord={recitedWord} counter="c" height={200} label="إياك نعبد" playing words={words} />,
      { theme: 'dark' },
    );
    await fireEvent(view.getByTestId('now-playing-scroll'), 'scroll', { nativeEvent: { contentOffset: { y: 100 } } });
    await fireEvent(view.getByLabelText('إياك نعبد'), 'layout', layoutOf(400));
    await fireEvent(view.getByTestId('now-playing-counter'), 'layout', layoutOf(16));
    await fireEvent(view.getByLabelText('إياك نعبد'), 'textLayout', { nativeEvent: { lines: followLines } });
    await fireEvent(view.getByTestId('now-playing-scroll'), 'layout', layoutOf(300));

    // The line is at 150 on screen (250 less the 100 pt offset): inside the band from 60 to 240.
    expect(scrollTo(view).mock.calls.filter(([options]) => options.animated)).toEqual([]);
  });

  it('does not follow when the player is not playing', async () => {
    const view = await renderFollowing(false);

    expect(scrollTo(view).mock.calls.filter(([options]) => options.animated)).toEqual([]);
  });

  it('pauses following on a drag, and resumes it 5 s after the drag ends', async () => {
    const view = await renderFollowing();
    const scroll = view.getByTestId('now-playing-scroll');
    scrollTo(view).mockClear();

    await fireEvent(scroll, 'scrollBeginDrag');
    await fireEvent(scroll, 'scrollEndDrag');
    await fireEvent(scroll, 'layout', layoutOf(302));
    expect(scrollTo(view)).not.toHaveBeenCalledWith(expect.objectContaining({ animated: true }));

    await act(async () => {
      jest.advanceTimersByTime(4999);
    });
    expect(scrollTo(view)).not.toHaveBeenCalledWith(expect.objectContaining({ animated: true }));

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    // 302 pt viewport: the line at 250 lands at 250 - 302 / 3.
    expect(scrollTo(view)).toHaveBeenLastCalledWith({ animated: true, y: expect.closeTo(250 - 302 / 3, 5) });
  });

  it('scrolls a new ayah back to its top', async () => {
    const view = await renderFollowing();
    scrollTo(view).mockClear();

    await view.rerender(
      <ThemeProvider name="dark">
        <NowPlayingAyah activeWord={null} counter="c" height={200} label="الآية التالية" words={words} />
      </ThemeProvider>,
    );

    expect(scrollTo(view)).toHaveBeenCalledWith({ animated: false, y: 0 });
  });
});
