import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTextScale, useTheme } from '@/core/theme';
import { UiText, useContrastColors } from '@/shared/ui';

const TRACK_HEIGHT = 4;
// The frame's card is 148 pt wide (16 pt padding, 10 pt gaps); it grows with the text scale so the title stays on one line.
const CARD_WIDTH = 148;
const CARD_PADDING = 16;
const CARD_GAP = 10;

/**
 * One Azkar session in Home's «أذكار مختارة» row (screens/, #Main): the session's name, a thin bar for
 * today's progress and its count, which sits at the end of the card. It opens the session's category.
 */
export function SelectedAzkarCard({
  title,
  progressText,
  fraction,
  onPress,
  testID = 'home-selected-azkar-card',
}: {
  title: string;
  progressText: string;
  /** 0 to 1 for the current period. */
  fraction: number;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const factor = useTextScale();
  const clamped = Math.min(Math.max(fraction, 0), 1);

  return (
    <Pressable
      accessibilityLabel={t('common.a11yPair', { label: title, title: progressText })}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: colors.line,
        borderRadius: theme.radius.lg,
        borderWidth: theme.stroke.hairline,
        gap: CARD_GAP,
        minWidth: Math.round(CARD_WIDTH * factor),
        opacity: pressed ? theme.opacity.pressed : 1,
        padding: CARD_PADDING,
      })}
      testID={testID}
    >
      <UiText numberOfLines={1} variant="headline">
        {title}
      </UiText>
      <View style={{ backgroundColor: colors.line, borderRadius: TRACK_HEIGHT / 2, height: TRACK_HEIGHT, overflow: 'hidden' }}>
        <View
          style={{
            backgroundColor: theme.colors.brand,
            borderRadius: TRACK_HEIGHT / 2,
            height: TRACK_HEIGHT,
            width: `${Math.round(clamped * 100)}%`,
          }}
          testID={`${testID}-progress`}
        />
      </View>
      <UiText style={{ alignSelf: 'flex-end' }} tone="muted" variant="caption">
        {progressText}
      </UiText>
    </Pressable>
  );
}
