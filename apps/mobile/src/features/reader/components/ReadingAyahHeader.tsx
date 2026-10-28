import { size } from '@quran/design-tokens';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AyahMarker, IconButton, type IconName } from '@/shared/ui';

import { AUDIO_AVAILABLE } from '../audio';

const noop = () => undefined;

const icons = {
  play: { ios: 'play.fill', android: 'play_arrow' },
  tafsir: { ios: 'book', android: 'menu_book' },
  more: { ios: 'ellipsis', android: 'more_horiz' },
} as const satisfies Record<string, IconName>;

// The ayah's header row: the end-of-ayah mark at the start, then play, tafsir and more at the end.
export function ReadingAyahHeader({
  verseNumber,
  active = false,
  fontScale = 1,
  onOpenActions,
  onOpenTafsir,
  testID,
}: {
  verseNumber: number;
  active?: boolean;
  fontScale?: number;
  onOpenActions?: () => void;
  onOpenTafsir?: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const audioHint = AUDIO_AVAILABLE ? undefined : t('reader.ayahPanel.audioUnavailable');

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
          disabled={!AUDIO_AVAILABLE}
          hint={audioHint}
          icon={icons.play}
          iconSize={size.iconSm}
          label={t('reader.ayahRow.play')}
          onPress={() => undefined}
          testID={testID ? `${testID}-play` : undefined}
          tone="muted"
        />
        <IconButton
          disabled={onOpenTafsir === undefined}
          icon={icons.tafsir}
          iconSize={size.iconMd}
          label={t('reader.ayahPanel.tafsir')}
          onPress={onOpenTafsir ?? noop}
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
