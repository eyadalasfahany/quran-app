import { locales, flatStyle, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';
import type { PlayerErrorCode } from '../playerStore';

import ar from '@/core/i18n/locales/ar.json';

import { PlayerErrorNotice } from './PlayerErrorNotice';

const messages: Record<PlayerErrorCode, string> = {
  'no-reciter': ar.player.errors.noReciter,
  'not-installed': ar.player.errors.notInstalled,
  'load-failed': ar.player.errors.loadFailed,
  'not-found': ar.player.errors.notFound,
  'invalid-chapter': ar.player.errors.invalidChapter,
  'invalid-verse': ar.player.errors.invalidVerse,
  offline: ar.player.errors.offline,
  'verify-required': ar.player.errors.verifyRequired,
};
const codes = Object.keys(messages) as PlayerErrorCode[];

describe('PlayerErrorNotice', () => {
  it.each(codes)('shows the Arabic message for %s, announced as an alert', async (code) => {
    const view = await renderUi(<PlayerErrorNotice code={code} />);
    const alert = view.getByRole('alert');

    expect(alert).toHaveTextContent(messages[code]);
    expect(alert.props.accessibilityLiveRegion).toBe('polite');
  });

  it('gives each code its own message in English', async () => {
    const view = await renderUi(<PlayerErrorNotice code="load-failed" />, { locale: 'en' });

    expect(view.getByText('The audio file could not be played. Try again.')).toBeOnTheScreen();
  });

  it.each(locales)('uses a player-line border on a card in %s', async (locale) => {
    const view = await renderUi(<PlayerErrorNotice code="not-found" />, { locale, theme: 'dark' });
    const card = view.getByTestId('player-error');

    expect(flatStyle(card.props.style)).toMatchObject({ borderColor: themes.dark.colors.playerLine, borderWidth: 1 });
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/PlayerErrorNotice.tsx')).toEqual([]);
  });
});
