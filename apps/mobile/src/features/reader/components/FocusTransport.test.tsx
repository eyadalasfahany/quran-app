import { fireEvent } from '@testing-library/react-native';

import { themes } from '@/core/theme';
import { hasAyahTimings, setRepeat } from '@/features/audio/player';
import { usePlayerStore } from '@/features/audio/playerStore';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { FocusTransport } from './FocusTransport';

jest.mock('@/features/audio/player', () => ({
  ...jest.requireActual<typeof import('@/features/audio/player')>('@/features/audio/player'),
  hasAyahTimings: jest.fn(() => true),
  setRepeat: jest.fn(() => true),
}));

const theme = themes.light;
const target = { chapterId: 1, verseId: 5 };

// Surah 1 loaded and playing, so the focused ayah's repeat is available.
function loadFocusedSurah() {
  usePlayerStore.setState({ chapterId: 1, status: 'paused' });
}

beforeEach(() => {
  usePlayerStore.getState().reset();
  jest.mocked(hasAyahTimings).mockReturnValue(true);
  jest.mocked(setRepeat).mockClear();
});

describe('FocusTransport', () => {
  it.each(locales)('labels every control in %s', async (locale) => {
    const view = await renderUi(<FocusTransport onNext={() => undefined} onPrevious={() => undefined} />, { locale });

    const labels =
      locale === 'ar'
        ? ['تكرار الآية ٣ مرات', 'الآية السابقة', 'تشغيل', 'الآية التالية', 'اختبر حفظك']
        : ['Repeat the ayah 3 times', 'Previous ayah', 'Play', 'Next ayah', 'Test your memorization'];
    expect(view.getAllByRole('button').map((button) => button.props.accessibilityLabel)).toEqual(labels);
  });

  it('moves to the previous and next ayah', async () => {
    const onPrevious = jest.fn();
    const onNext = jest.fn();
    const view = await renderUi(<FocusTransport onNext={onNext} onPrevious={onPrevious} />);

    await fireEvent.press(view.getByTestId('focus-transport-previous'));
    await fireEvent.press(view.getByTestId('focus-transport-next'));
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('disables previous and next at the edges of the surah', async () => {
    const view = await renderUi(<FocusTransport />);

    expect(view.getByTestId('focus-transport-previous').props.accessibilityState).toMatchObject({ disabled: true });
    expect(view.getByTestId('focus-transport-next').props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('draws the play control as a brand circle and every step control at least a touch target wide', async () => {
    const view = await renderUi(<FocusTransport onNext={() => undefined} onPrevious={() => undefined} />);

    expect(flatStyle(view.getByTestId('focus-transport-play').props.style)).toMatchObject({
      backgroundColor: theme.colors.brand,
      borderRadius: theme.radius.pill,
      height: 52,
      width: 52,
    });
    expect(flatStyle(view.getByTestId('focus-transport-previous').props.style).width).toBe(theme.size.touchTarget);
    expect(flatStyle(view.getByTestId('focus-transport-next').props.style).width).toBe(theme.size.touchTarget);
  });

  it('breaks the memorize label onto two lines in Arabic, as the frame does', async () => {
    const view = await renderUi(<FocusTransport />, { locale: 'ar' });
    const label = view.getByText('اختبر\nحفظك');

    expect(flatStyle(label.props.style)).toMatchObject({ fontSize: 13, lineHeight: theme.size.focusLabelLineHeight });
  });

  it('sets the transport labels in the 600 weight face', async () => {
    const view = await renderUi(<FocusTransport />, { locale: 'en' });

    expect(flatStyle(view.getByText('3×').props.style).fontFamily).toBe('IBMPlexSansArabic-SemiBold');
  });

  it.each(locales)('keeps the up and down chevrons unflipped in %s', async (locale) => {
    const view = await renderUi(<FocusTransport onNext={() => undefined} onPrevious={() => undefined} />, { locale });

    for (const id of ['focus-transport-previous', 'focus-transport-next']) {
      const [icon] = view.getByTestId(id).children;
      expect(flatStyle(typeof icon === 'object' ? icon.props.style : undefined).transform).toBeUndefined();
    }
  });

  it('shows the repeat count in Arabic numerals in Arabic', async () => {
    const view = await renderUi(<FocusTransport />, { locale: 'ar' });

    expect(view.getByTestId('focus-transport-repeat')).toHaveTextContent('٣', { exact: false });
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/reader/components/FocusTransport.tsx')).toEqual([]);
  });
});

describe('FocusTransport repeat', () => {
  it('is disabled without a focused ayah', async () => {
    const view = await renderUi(<FocusTransport />, { locale: 'en' });

    expect(view.getByTestId('focus-transport-repeat').props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('is disabled when the focused ayah\'s surah is not the one loaded in the player', async () => {
    usePlayerStore.setState({ chapterId: 2, status: 'paused' });
    const view = await renderUi(<FocusTransport repeatTarget={target} />, { locale: 'en' });

    expect(view.getByTestId('focus-transport-repeat').props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('is disabled when the loaded surah has no ayah timings', async () => {
    loadFocusedSurah();
    jest.mocked(hasAyahTimings).mockReturnValue(false);
    const view = await renderUi(<FocusTransport repeatTarget={target} />, { locale: 'en' });

    expect(view.getByTestId('focus-transport-repeat').props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('sets the focused ayah to repeat three times, through the engine', async () => {
    loadFocusedSurah();
    const view = await renderUi(<FocusTransport repeatTarget={target} />, { locale: 'en' });

    fireEvent.press(view.getByTestId('focus-transport-repeat'));
    expect(setRepeat).toHaveBeenCalledWith({ count: 3, fromVerseId: 5, toVerseId: 5 });
  });

  it('clears the repeat when it is on', async () => {
    loadFocusedSurah();
    usePlayerStore.getState().setRepeat({ count: 3, fromVerseId: 5, toVerseId: 5 });
    const view = await renderUi(<FocusTransport repeatTarget={target} />, { locale: 'en' });

    fireEvent.press(view.getByTestId('focus-transport-repeat'));
    expect(usePlayerStore.getState().repeat).toBeNull();
    expect(setRepeat).not.toHaveBeenCalled();
  });

  it('labels the active repeat with its count from the store, in the brand accent', async () => {
    loadFocusedSurah();
    usePlayerStore.getState().setRepeat({ count: 5, fromVerseId: 5, toVerseId: 5 });
    const view = await renderUi(<FocusTransport repeatTarget={target} />, { locale: 'en' });

    expect(view.getByText('5×')).toBeOnTheScreen();
    expect(flatStyle(view.getByText('5×').props.style).color).toBe(theme.colors.brand);
  });

  it('shows the forever sign for an endless repeat', async () => {
    loadFocusedSurah();
    usePlayerStore.getState().setRepeat({ count: Infinity, fromVerseId: 5, toVerseId: 5 });
    const view = await renderUi(<FocusTransport repeatTarget={target} />, { locale: 'en' });

    expect(view.getByText('∞')).toBeOnTheScreen();
  });

  it('keeps the frame\'s «٣×» in the ink colour when off', async () => {
    loadFocusedSurah();
    const view = await renderUi(<FocusTransport repeatTarget={target} />, { locale: 'ar' });

    expect(flatStyle(view.getByText('٣×').props.style).color).toBe(theme.colors.ink);
  });
});

describe('FocusTransport play', () => {
  it('plays from the focused ayah, and shows pause while playing', async () => {
    const onPlay = jest.fn();
    const view = await renderUi(<FocusTransport onPlay={onPlay} />, { locale: 'en' });
    fireEvent.press(view.getByRole('button', { name: 'Play' }));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('is disabled without a play handler (no reciter available)', async () => {
    const view = await renderUi(<FocusTransport />, { locale: 'en' });
    expect(view.getByRole('button', { name: 'Play' }).props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('labels the control pause while playing', async () => {
    const view = await renderUi(<FocusTransport onPlay={() => undefined} playing />, { locale: 'en' });
    expect(view.getByRole('button', { name: 'Pause' })).toBeOnTheScreen();
  });
});
