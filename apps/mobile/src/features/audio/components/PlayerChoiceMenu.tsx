import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSlideUp, useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui/UiText';

import { PlayerChoiceRow } from './PlayerChoiceRow';
import { PlayerOverlay } from './PlayerOverlay';

export type PlayerChoice<T extends string | number> = { value: T; label: string; disabled?: boolean };

// A small action sheet for a list of mutually exclusive choices (HIG pop-up button). The app has no native menu
// library, so the sheet is drawn here: it slides up over a scrim, and Cancel, the scrim and Android back close it.
// The player is dark in every theme, so the sheet takes the player's tokens.
export function PlayerChoiceMenu<T extends string | number>({
  visible,
  title,
  choices,
  selected,
  onSelect,
  onClose,
  testID,
}: {
  visible: boolean;
  title: string;
  choices: PlayerChoice<T>[];
  selected: T;
  onSelect: (value: T) => void;
  onClose: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const slide = useSlideUp();
  const card = {
    backgroundColor: theme.colors.playerBg,
    borderColor: theme.colors.playerLine,
    borderRadius: theme.radius.lg,
    borderWidth: theme.stroke.hairline,
    overflow: 'hidden' as const,
  };

  // Android back closes the menu first. It is added after the player's own handler, so it runs first.
  useEffect(() => {
    if (!visible) {
      return undefined;
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => {
      subscription.remove();
    };
  }, [onClose, visible]);

  if (!visible) {
    return null;
  }

  // Not a React Native Modal: the player is itself a native modal, and iOS silently refuses to present a
  // second one from it. The menu is drawn in the player host's overlay instead.
  return (
    <PlayerOverlay>
      <View style={styles.root} testID={testID ? `${testID}-overlay` : undefined}>
        <Pressable
          accessible={false}
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.scrim }]}
          testID={testID ? `${testID}-scrim` : undefined}
        />
        <Animated.View
          accessibilityViewIsModal
          entering={slide.entering}
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, theme.space[2]) }]}
          testID={testID}
        >
          <View style={card}>
            <View style={{ paddingHorizontal: theme.space[4], paddingVertical: theme.space[3] }}>
              <UiText accessibilityRole="header" style={{ color: theme.colors.playerMuted }} variant="label" weight={500}>
                {title}
              </UiText>
            </View>
            {choices.map((choice) => (
              <PlayerChoiceRow
                checked={choice.value === selected}
                disabled={choice.disabled}
                key={String(choice.value)}
                label={choice.label}
                onPress={() => onSelect(choice.value)}
                testID={testID ? `${testID}-${String(choice.value)}` : undefined}
              />
            ))}
          </View>
          <View style={card}>
            <Pressable
              accessibilityLabel={t('player.menu.cancel')}
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => ({
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: theme.size.touchTarget,
                backgroundColor: pressed ? theme.colors.playerGlassFill : 'transparent',
              })}
              testID={testID ? `${testID}-cancel` : undefined}
            >
              <UiText style={{ color: theme.colors.playerAccent }} variant="headline" weight={600}>
                {t('player.menu.cancel')}
              </UiText>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </PlayerOverlay>
  );
}

const styles = StyleSheet.create({
  root: { bottom: 0, justifyContent: 'flex-end', left: 0, position: 'absolute', right: 0, top: 0 },
  sheet: { gap: 8, paddingHorizontal: 8 },
});
