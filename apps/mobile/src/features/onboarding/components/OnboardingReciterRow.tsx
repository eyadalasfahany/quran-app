import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { ReciterPlayButton } from '@/features/audio/components/ReciterPlayButton';
import { ReciterTile } from '@/features/audio/components/ReciterTile';
import { UiText } from '@/shared/ui';
import { useContrastColors } from '@/shared/ui/useContrastColors';

/** Onboarding reciter row: select + preview only (quran-app-design-system.html, Listen). */
export function OnboardingReciterRow({
  name,
  letter,
  selected,
  styleLabel,
  playLabel,
  playHint,
  playing = false,
  onSelect,
  onPlay,
  testID,
}: {
  name: string;
  letter: string;
  selected: boolean;
  styleLabel: string | null;
  playLabel: string;
  playHint?: string;
  playing?: boolean;
  onSelect: () => void;
  onPlay: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const border = selected ? theme.colors.brand : colors.line;

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: border,
        borderRadius: theme.radius.lg,
        borderWidth: selected ? 1 : theme.stroke.hairline,
        flexDirection: 'row',
        gap: theme.space[2],
        minHeight: 64,
        paddingEnd: theme.space[2],
        paddingStart: theme.space[3],
        paddingVertical: theme.space[1],
      }}
      testID={testID}
    >
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        onPress={onSelect}
        style={({ pressed }) => ({
          alignItems: 'center',
          flex: 1,
          flexDirection: 'row',
          gap: theme.space[3],
          minHeight: 52,
          opacity: pressed ? theme.opacity.pressed : 1,
        })}
      >
        <ReciterTile letter={letter} selected={selected} />
        <View style={{ flex: 1, gap: 2 }}>
          <UiText variant="body" weight={600}>
            {name}
          </UiText>
          {styleLabel ? (
            <UiText tone="muted" variant="caption">
              {styleLabel}
            </UiText>
          ) : null}
        </View>
      </Pressable>
      <ReciterPlayButton hint={playHint} label={playLabel} onPress={onPlay} playing={playing} progress={null} />
    </View>
  );
}
