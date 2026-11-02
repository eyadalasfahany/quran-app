import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { formatNumber, type Locale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { hasAyahTimings, setRepeat } from '@/features/audio/player';
import { usePlayerStore } from '@/features/audio/playerStore';
import { BufferingRing, GlassSurface, Icon, UiText } from '@/shared/ui';

// A tap while the focused ayah starts does nothing: a second start would load it again.
const ignoreTap = () => undefined;

const UP = { ios: 'chevron.up', android: 'keyboard_arrow_up' } as const;
const DOWN = { ios: 'chevron.down', android: 'keyboard_arrow_down' } as const;
const PLAY = { ios: 'play.fill', android: 'play_arrow' } as const;
const REPEAT = { ios: 'repeat', android: 'repeat' } as const;
const PAUSE = { ios: 'pause.fill', android: 'pause' } as const;
const MEMORIZE = { ios: 'eye.slash', android: 'visibility_off' } as const;

// The Focus frame (quran-app-screens.html, #Focus): every control is 52 tall. Labelled controls pad 14 and
// space their icon and label 6. The bar pads and spaces its controls 4 (space[1]). Step controls are 44 wide.
const CONTROL = 52;
const LABELLED_PADDING = 14;
const LABELLED_GAP = 6;
// The frame's labels are 13 px at weight 600.
const LABEL_WEIGHT = 600;
// The Focus repeat is one toggle: off, or the focused ayah repeated this many times (the frame's «٣×»).
const FOCUS_REPEAT_COUNT = 3;

/** The focused ayah and its surah: what the repeat applies to. Null when the ayah is not in the content database. */
export type RepeatTarget = { verseId: number; chapterId: number };

export function FocusTransport({
  onPrevious,
  onNext,
  onPlay,
  playing = false,
  starting = false,
  repeatTarget = null,
  testID = 'focus-transport',
}: {
  onPrevious?: () => void;
  onNext?: () => void;
  /** Plays from the focused ayah, or pauses when playing. Undefined disables the control. */
  onPlay?: () => void;
  playing?: boolean;
  /** The focused ayah's play is starting: the play control shows pause with the buffering ring. */
  starting?: boolean;
  /** The focused ayah the repeat applies to. Null disables the repeat control. */
  repeatTarget?: RepeatTarget | null;
  testID?: string;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const ink = theme.colors.ink;
  // The repeat follows the player's store: its label and accent show the active repeat, and the control is
  // enabled only when the focused ayah's surah is the one loaded with ayah timings.
  const repeat = usePlayerStore((state) => state.repeat);
  const recitedChapterId = usePlayerStore((state) => state.chapterId);
  const status = usePlayerStore((state) => state.status);
  const canRepeat =
    repeatTarget !== null && recitedChapterId === repeatTarget.chapterId && status !== 'idle' && hasAyahTimings();
  const repeating = repeat !== null;
  const repeatLabel =
    repeat === null
      ? t('reader.focus.repeatShort', { count: formatNumber(FOCUS_REPEAT_COUNT, locale) })
      : repeat.count === Infinity
        ? t('player.repeat.forever')
        : t('player.repeat.times', { count: formatNumber(repeat.count, locale) });
  const toggleRepeat = () => {
    if (repeat !== null) {
      usePlayerStore.getState().clearRepeat();
      return;
    }
    if (repeatTarget !== null) {
      // The engine refuses a range its timings lack; then nothing changes.
      setRepeat({ count: FOCUS_REPEAT_COUNT, fromVerseId: repeatTarget.verseId, toVerseId: repeatTarget.verseId });
    }
  };
  const labelled = {
    alignItems: 'center',
    flexDirection: 'row',
    gap: LABELLED_GAP,
    height: CONTROL,
    paddingHorizontal: LABELLED_PADDING,
  } as const;
  const step = { alignItems: 'center', height: CONTROL, justifyContent: 'center', width: theme.size.touchTarget } as const;
  const labelStyle = { lineHeight: theme.size.focusLabelLineHeight };

  return (
    <GlassSurface radius="pill" style={{ alignSelf: 'center' }} testID={testID}>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[1], padding: theme.space[1] }}>
        <Pressable
          accessibilityLabel={repeating ? t('player.repeat.title') : t('reader.focus.repeat')}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canRepeat, selected: repeating }}
          disabled={!canRepeat}
          onPress={toggleRepeat}
          style={labelled}
          testID={`${testID}-repeat`}
        >
          <Icon color={repeating ? theme.colors.brand : ink} name={REPEAT} size={theme.size.iconMd} />
          <UiText scale="bar" style={labelStyle} tone={repeating ? 'brand' : 'ink'} variant="caption" weight={LABEL_WEIGHT}>
            {repeatLabel}
          </UiText>
        </Pressable>
        <Pressable
          accessibilityLabel={t('reader.focus.previous')}
          accessibilityRole="button"
          disabled={onPrevious === undefined}
          onPress={onPrevious}
          style={step}
          testID={`${testID}-previous`}
        >
          <Icon color={ink} name={UP} size={theme.size.icon} />
        </Pressable>
        <BufferingRing
          active={starting}
          color={theme.colors.onBrand}
          size={CONTROL}
          testID={`${testID}-play-ring`}
        >
          <Pressable
            accessibilityLabel={playing || starting ? t('player.pause') : t('reader.focus.play')}
            accessibilityRole="button"
            accessibilityState={starting ? { busy: true, disabled: onPlay === undefined } : { disabled: onPlay === undefined }}
            disabled={onPlay === undefined}
            onPress={playing || !starting ? onPlay : ignoreTap}
            style={{
              alignItems: 'center',
              backgroundColor: theme.colors.brand,
              borderRadius: theme.radius.pill,
              height: CONTROL,
              justifyContent: 'center',
              width: CONTROL,
            }}
            testID={`${testID}-play`}
          >
            <Icon color={theme.colors.onBrand} name={playing || starting ? PAUSE : PLAY} size={theme.size.icon} />
          </Pressable>
        </BufferingRing>
        <Pressable
          accessibilityLabel={t('reader.focus.next')}
          accessibilityRole="button"
          disabled={onNext === undefined}
          onPress={onNext}
          style={step}
          testID={`${testID}-next`}
        >
          <Icon color={ink} name={DOWN} size={theme.size.icon} />
        </Pressable>
        <Pressable accessibilityLabel={t('reader.focus.memorize')} accessibilityRole="button" style={labelled} testID={`${testID}-memorize`}>
          <Icon color={ink} name={MEMORIZE} size={theme.size.iconMd} />
          {/* The label breaks where the frame breaks it, so the control is only as wide as its widest line. */}
          <UiText align="center" scale="bar" style={labelStyle} variant="caption" weight={LABEL_WEIGHT}>
            {t('reader.focus.memorizeLabel')}
          </UiText>
        </Pressable>
      </View>
    </GlassSurface>
  );
}
