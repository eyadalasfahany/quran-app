import { View, Pressable } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText, useContrastColors } from '@/shared/ui';

import { ReciterPlayButton } from './ReciterPlayButton';
import { ReciterStyleTag } from './ReciterStyleTag';
import { ReciterTile } from './ReciterTile';

export type ReciterRowStatus = { label: string; tone: 'muted' | 'danger' };

// One reciter in the Listen list (quran-app-screens.html, #Reciters). Tapping the info selects the reciter;
// the play button is a separate control beside it.
export function ReciterRow({
  name,
  letter,
  selected,
  styleLabel,
  status,
  playLabel,
  playHint,
  downloadProgress,
  onSelect,
  onPlay,
  testID,
}: {
  name: string;
  letter: string;
  /** The chosen (default) reciter: the tile is filled. */
  selected: boolean;
  /** null until the pack is installed, because the style comes from the installed recitation. */
  styleLabel: string | null;
  status: ReciterRowStatus | null;
  playLabel: string;
  playHint?: string;
  /** 0 to 1 while the pack downloads, null otherwise. */
  downloadProgress: number | null;
  onSelect: () => void;
  onPlay: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const hasTags = styleLabel !== null || status !== null;

  return (
    <View
      style={{
        alignItems: 'center',
        borderBottomColor: colors.line,
        borderBottomWidth: theme.stroke.hairline,
        flexDirection: 'row',
        gap: theme.space[3],
        minHeight: 66,
      }}
      testID={testID}
    >
      <Pressable
        accessibilityHint={status?.label}
        accessibilityLabel={name}
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        onPress={onSelect}
        style={({ pressed }) => ({
          alignItems: 'center',
          flex: 1,
          flexDirection: 'row',
          gap: theme.space[3],
          minWidth: 0,
          opacity: pressed ? theme.opacity.pressed : 1,
        })}
        testID={testID ? `${testID}-select` : undefined}
      >
        <ReciterTile letter={letter} selected={selected} testID={testID ? `${testID}-tile` : undefined} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <UiText variant="headline">{name}</UiText>
          {hasTags ? (
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.size.chipGap }}>
              {styleLabel !== null ? (
                <ReciterStyleTag label={styleLabel} testID={testID ? `${testID}-style` : undefined} />
              ) : null}
              {status !== null ? (
                <UiText
                  testID={testID ? `${testID}-status` : undefined}
                  tone={status.tone}
                  variant="label"
                  weight={400}
                >
                  {status.label}
                </UiText>
              ) : null}
            </View>
          ) : null}
        </View>
      </Pressable>
      <ReciterPlayButton
        hint={playHint}
        label={playLabel}
        onPress={onPlay}
        progress={downloadProgress}
        testID={testID ? `${testID}-play` : undefined}
      />
    </View>
  );
}
