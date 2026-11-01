import { size } from '@quran/design-tokens';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AyahMarker, IconButton, type IconName } from '@/shared/ui';

const noop = () => undefined;

const icons = {
  play: { ios: 'play.fill', android: 'play_arrow' },
  pause: { ios: 'pause.fill', android: 'pause' },
  tafsir: { ios: 'book', android: 'menu_book' },
  more: { ios: 'ellipsis', android: 'more_horiz' },
} as const satisfies Record<string, IconName>;

// The ayah's header row: the end-of-ayah mark at the start, then play, tafsir and more at the end. While `playing`,
// the play control shows pause and `onPlay` is the pause action.
export function ReadingAyahHeader({
  verseNumber,
  active = false,
  fontScale = 1,
  audioAvailable = false,
  playing = false,
  onPlay,
  onOpenActions,
  onOpenTafsir,
  tafsirPressed = false,
  testID,
}: {
  verseNumber: number;
  active?: boolean;
  fontScale?: number;
  /** Whether a reciter can play from here (useAudioAvailable). */
  audioAvailable?: boolean;
  /** This ayah is being recited: the play control shows pause. */
  playing?: boolean;
  onPlay?: () => void;
  onOpenActions?: () => void;
  onOpenTafsir?: () => void;
  /** Reading mode inline tafsir is on: the tafsir control shows selected. */
  tafsirPressed?: boolean;
  testID?: string;
}) {
  const { t } = useTranslation();
  const audioHint = audioAvailable ? undefined : t('reader.ayahPanel.audioUnavailable');

  return (
    <View
      style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}
      testID={testID}
    >
      <AyahMarker
        active={active}
        fontScale={fontScale}
        number={verseNumber}
        onPress={onOpenActions}
        testID={testID ? `${testID}-marker` : undefined}
      />
      <View style={{ flexDirection: 'row' }}>
        <IconButton
          disabled={!audioAvailable || onPlay === undefined}
          hint={audioHint}
          icon={playing ? icons.pause : icons.play}
          iconSize={size.iconSm}
          label={playing ? t('player.pause') : t('reader.ayahRow.play')}
          mirrorInRtl
          onPress={onPlay ?? noop}
          testID={testID ? `${testID}-play` : undefined}
          tone="muted"
        />
        <IconButton
          disabled={onOpenTafsir === undefined}
          icon={icons.tafsir}
          iconSize={size.iconMd}
          label={t('reader.ayahPanel.tafsir')}
          onPress={onOpenTafsir ?? noop}
          pressed={tafsirPressed}
          testID={testID ? `${testID}-tafsir` : undefined}
          tone="muted"
        />
        <IconButton
          disabled={onOpenActions === undefined}
          icon={icons.more}
          iconSize={size.iconMd}
          label={t('reader.ayahRow.more')}
          onPress={onOpenActions ?? noop}
          testID={testID ? `${testID}-more` : undefined}
          tone="muted"
        />
      </View>
    </View>
  );
}
