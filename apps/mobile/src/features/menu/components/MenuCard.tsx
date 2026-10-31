import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, UiText, useContrastColors, type IconName } from '@/shared/ui';

const TRACK_HEIGHT = 4;
// The card's title is Amiri 22 (quran-app-screens.html, #Menu). No display token has that size, so the size is set here
// as the Khatma header does; the family and weight still come from the display scale.
const TITLE_SIZE = 22;
const TITLE_LINE_HEIGHT = 29;

/**
 * One card of the menu (quran-app-screens.html, #Menu): the icon and a small caption, the Amiri title, an optional
 * preview line and an optional thin progress bar. The whole card is one button.
 */
export function MenuCard({
  icon,
  caption,
  title,
  preview,
  progress,
  onPress,
  testID,
}: {
  icon: IconName;
  caption: string;
  title: string;
  preview?: string;
  /** 0 to 1. Omitted, no bar is drawn. */
  progress?: number;
  onPress: () => void;
  testID: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const fraction = progress === undefined ? 0 : Math.min(Math.max(progress, 0), 1);
  const label = [caption, title, preview].filter((part) => part !== undefined && part !== '').join(', ');

  return (
    <Pressable
      accessibilityHint={t('menu.card.hint', { title })}
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: colors.line,
        borderRadius: theme.radius.hero,
        borderWidth: theme.stroke.hairline,
        gap: theme.space[2],
        opacity: pressed ? theme.opacity.pressed : 1,
        padding: theme.space[4],
      })}
      testID={testID}
    >
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[2] }}>
        <Icon color={theme.colors.brand} name={icon} />
        <UiText tone="muted" variant="caption">
          {caption}
        </UiText>
      </View>
      <UiText style={{ fontSize: TITLE_SIZE, lineHeight: TITLE_LINE_HEIGHT }} variant="displaySm">
        {title}
      </UiText>
      {preview ? (
        <UiText testID={`${testID}-preview`} tone="muted" variant="subhead">
          {preview}
        </UiText>
      ) : null}
      {progress === undefined ? null : (
        <View
          style={{
            backgroundColor: colors.line,
            borderRadius: TRACK_HEIGHT / 2,
            height: TRACK_HEIGHT,
            marginTop: theme.space[1],
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.goldOnBrandSurface,
              borderRadius: TRACK_HEIGHT / 2,
              height: TRACK_HEIGHT,
              width: `${Math.round(fraction * 100)}%`,
            }}
            testID={`${testID}-progress`}
          />
        </View>
      )}
    </Pressable>
  );
}
