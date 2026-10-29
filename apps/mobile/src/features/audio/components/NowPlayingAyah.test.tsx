import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

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
});
