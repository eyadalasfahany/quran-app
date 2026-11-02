import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

import { RecentListenPlayButton } from './RecentListenPlayButton';

// The frame's tile is 48 pt, radius 14, with an Amiri 22 letter. No type token has 22, so the size is local.
const TILE_SIZE = 48;
const LETTER_SIZE = 22;
const LETTER_LINE_HEIGHT = 39; // round(22 × 1.758): Amiri's natural leading, so marks don't clip.
const TEXT_GAP = 2;

// One recent listen on Home: the reciter's tile, the reciter and the surah with its style, and a play button.
export function RecentListenRow({
  letter,
  name,
  subtitle,
  playLabel,
  filled,
  playing = false,
  starting = false,
  onPlay,
  testID,
}: {
  /** The reciter's initial. Decorative: the row's label carries the name. */
  letter: string;
  name: string;
  /** «سورة الكهف · مرتّل», or the surah alone when the style is unknown. */
  subtitle: string;
  playLabel: string;
  /** The most recent row's button is filled. */
  filled: boolean;
  /** This listen is playing: its button shows pause. */
  playing?: boolean;
  /** This listen is starting: its button shows pause with the buffering ring. */
  starting?: boolean;
  onPlay: () => void;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[3] }} testID={testID}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          alignItems: 'center',
          backgroundColor: theme.colors.fillSecondary,
          borderRadius: theme.radius.md,
          height: TILE_SIZE,
          justifyContent: 'center',
          width: TILE_SIZE,
        }}
        testID={testID ? `${testID}-tile` : undefined}
      >
        <UiText style={{ fontSize: LETTER_SIZE, lineHeight: LETTER_LINE_HEIGHT }} tone="brand" variant="displaySm">
          {letter}
        </UiText>
      </View>
      <View accessibilityLabel={`${name}, ${subtitle}`} accessible style={{ flex: 1, gap: TEXT_GAP, minWidth: 0 }}>
        <UiText variant="headline">{name}</UiText>
        <UiText tone="muted" variant="caption">
          {subtitle}
        </UiText>
      </View>
      <RecentListenPlayButton
        filled={filled}
        label={playLabel}
        onPress={onPlay}
        playing={playing}
        starting={starting}
        testID={testID ? `${testID}-play` : undefined}
      />
    </View>
  );
}
