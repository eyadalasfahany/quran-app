import { locales, flatStyle, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import { NowPlayingTitle } from './NowPlayingTitle';

const colors = themes.dark.colors;

describe('NowPlayingTitle', () => {
  it('shows the reciter as a header and the surah in the muted player ink', async () => {
    const view = await renderUi(<NowPlayingTitle reciter="مشاري راشد العفاسي" style="مرتّل" surah="سورة الفاتحة" />, {
      theme: 'dark',
    });

    expect(view.getByRole('header', { name: 'مشاري راشد العفاسي' })).toBeOnTheScreen();
    expect(flatStyle(view.getByText('مشاري راشد العفاسي').props.style).color).toBe(colors.playerInk);
    expect(flatStyle(view.getByText('سورة الفاتحة').props.style).color).toBe(colors.playerMuted);
  });

  it('shows the style pill in the accent colour with a player-line border', async () => {
    const view = await renderUi(<NowPlayingTitle reciter="r" style="مرتّل" surah="s" />, { theme: 'dark' });
    const pill = view.getByTestId('now-playing-style', { includeHiddenElements: true });

    expect(flatStyle(pill.props.style)).toMatchObject({ borderColor: colors.playerLine, borderWidth: 1 });
    expect(flatStyle(view.getByText('مرتّل').props.style).color).toBe(colors.playerAccent);
  });

  it('centres the reciter name, so a long name does not hug the start edge', async () => {
    const view = await renderUi(<NowPlayingTitle reciter="مشاري راشد العفاسي" style={null} surah="سورة الفاتحة" />, {
      locale: 'en',
    });

    expect(flatStyle(view.getByTestId('now-playing-reciter').props.style).textAlign).toBe('center');
  });

  it('hides the style pill when the style is unknown (null)', async () => {
    const view = await renderUi(<NowPlayingTitle reciter="r" style={null} surah="s" />);

    expect(view.queryByTestId('now-playing-style', { includeHiddenElements: true })).toBeNull();
  });

  it.each(locales)('renders the names as given in %s', async (locale) => {
    const view = await renderUi(<NowPlayingTitle reciter="Mishary" style="Murattal" surah="Al-Fatiha" />, { locale });

    expect(view.getByText('Mishary')).toBeOnTheScreen();
    expect(view.getByText('Murattal')).toBeOnTheScreen();
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/NowPlayingTitle.tsx')).toEqual([]);
  });
});
