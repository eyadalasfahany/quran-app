import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, UiText, useContrastColors, type IconName } from '@/shared/ui';

import { useMenuSectionTone } from './MenuSection';
import { menuToneColors, type MenuTone } from './menuTone';

const TRACK_HEIGHT = 4;

/**
 * One card of the menu (screens/frames/menu, #MenuSections): a coloured icon tile, the Amiri title, an optional preview
 * line and an optional thin progress bar. The tile takes the section's colour unless `tone` is given. The caption is not
 * drawn (the section title stands in for it); VoiceOver still reads it before the title. The whole card is one button.
 */
export function MenuCard({
  icon,
  caption,
  title,
  preview,
  progress,
  tone,
  onPress,
  testID,
}: {
  icon: IconName;
  caption?: string;
  title: string;
  preview?: string;
  /** 0 to 1. Omitted, no bar is drawn. */
  progress?: number;
  tone?: MenuTone;
  onPress: () => void;
  testID: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const sectionTone = useMenuSectionTone();
  const { tile, ink } = menuToneColors(theme.colors, tone ?? sectionTone);
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
        flex: 1,
        gap: theme.space[3],
        opacity: pressed ? theme.opacity.pressed : 1,
        padding: theme.space[4],
      })}
      testID={testID}
    >
      <View
        style={{
          alignItems: 'center',
          backgroundColor: tile,
          borderRadius: theme.radius.md,
          height: theme.size.touchTarget,
          justifyContent: 'center',
          width: theme.size.touchTarget,
        }}
        testID={`${testID}-tile`}
      >
        <Icon color={ink} name={icon} size={theme.size.iconLg} />
      </View>
      <View style={{ gap: theme.space[1] }}>
        <UiText variant="displaySm">{title}</UiText>
        {preview ? (
          <UiText numberOfLines={2} testID={`${testID}-preview`} tone="muted" variant="subhead">
            {preview}
          </UiText>
        ) : null}
      </View>
      {progress === undefined ? null : (
        <View
          style={{
            backgroundColor: colors.line,
            borderRadius: TRACK_HEIGHT / 2,
            height: TRACK_HEIGHT,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              backgroundColor: ink,
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
