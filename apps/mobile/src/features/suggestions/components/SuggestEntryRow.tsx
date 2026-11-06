import { router, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/theme';
import { Icon, UiText, useContrastColors } from '@/shared/ui';

const BULB = { ios: 'lightbulb', android: 'lightbulb' } as const;
const CHEVRON = { ios: 'chevron.right', android: 'chevron_right' } as const;

// The frame's icon tile is 36 pt with a 10 pt radius; the row is at least 64 pt tall (quran-app-screens.html, #SettingsSuggestCard).
const TILE_SIZE = 36;
const TILE_RADIUS = 10;
const ROW_MIN_HEIGHT = 64;

/**
 * The Settings row that opens «اقترح فكرة» (`/settings/suggest`). It is its own group, between the reminders and the about
 * section. It is drawn like the frame: a bold title over a muted subtitle, with a tile and a chevron.
 */
export function SuggestEntryRow({ testID = 'suggest-entry' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const title = t('suggest.entryTitle');
  const subtitle = t('suggest.entryHint');

  return (
    <Pressable
      accessibilityLabel={`${title}, ${subtitle}`}
      accessibilityRole="button"
      onPress={() => router.push('/settings/suggest' as Href)}
      style={({ pressed }) => ({
        alignItems: 'center',
        flexDirection: 'row',
        gap: theme.space[3],
        minHeight: ROW_MIN_HEIGHT,
        paddingHorizontal: theme.space[4] - 2,
        paddingVertical: theme.space[3],
        backgroundColor: pressed ? theme.colors.fillSecondary : 'transparent',
      })}
      testID={testID}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          alignItems: 'center',
          backgroundColor: theme.colors.fillSecondary,
          borderRadius: TILE_RADIUS,
          flexShrink: 0,
          height: TILE_SIZE,
          justifyContent: 'center',
          width: TILE_SIZE,
        }}
      >
        <Icon color={theme.colors.brand} name={BULB} size={theme.size.iconMd} testID={`${testID}-icon`} />
      </View>
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <UiText variant="headline">{title}</UiText>
        <UiText tone="muted" variant="caption">
          {subtitle}
        </UiText>
      </View>
      <Icon color={colors.inkMuted} mirrorInRtl name={CHEVRON} size={16} testID={`${testID}-chevron`} />
    </Pressable>
  );
}
