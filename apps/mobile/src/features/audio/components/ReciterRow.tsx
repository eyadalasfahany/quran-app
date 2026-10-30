import { View, Pressable } from 'react-native';

import { useTheme } from '@/core/theme';
import { IconButton, UiText, useContrastColors } from '@/shared/ui';

import { MORE_ICON } from './player-icons';
import { ReciterPlayButton } from './ReciterPlayButton';
import { ReciterStyleTag } from './ReciterStyleTag';
import { ReciterTile } from './ReciterTile';

export type ReciterRowStatus = { label: string; tone: 'muted' | 'danger' };

// One reciter in the Listen list (quran-app-screens.html, #Reciters). Tapping the info selects the reciter;
// the play button is a separate control beside it, and the «⋯» button opens the reciter's page.
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
  onOptions,
  optionsLabel,
  testID,
}: {
  name: string;
  letter: string;
  /** The chosen (default) reciter: the tile is filled. */
  selected: boolean;
  /** The recitation style tag, or null when the reciter has no style. */
  styleLabel: string | null;
  status: ReciterRowStatus | null;
  playLabel: string;
  playHint?: string;
  /** 0 to 1 while the pack downloads, null otherwise. */
  downloadProgress: number | null;
  onSelect: () => void;
  onPlay: () => void;
  /** Opens the reciter's page (its downloads). */
  onOptions: () => void;
  optionsLabel: string;
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
      <IconButton
        icon={MORE_ICON}
        iconSize={20}
        label={optionsLabel}
        onPress={onOptions}
        testID={testID ? `${testID}-options` : undefined}
        tone="muted"
      />
    </View>
  );
}
