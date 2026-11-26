import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useLocale } from '@/core/i18n';
import { prayerClock } from '@/core/i18n/clock';
import { minutesUntil, remainingLabel } from '@/core/i18n/durations';
import { useTheme } from '@/core/theme';
import { isTime } from '@/features/home/data/next-prayer';
import { useNextPrayer, useNow, usePrayerLocation, useTodayTimes } from '@/features/salah/hooks';
import { Icon, UiText, type IconName } from '@/shared/ui';

// A minute tick is enough: the menu only shows minutes, and the Salah screen keeps the second-by-second countdown.
export const MENU_SALAH_TICK_MS = 60_000;

// The glyph tile and the pill are onBrandSurface at these opacities over the green (screens/frames/menu, #MenuSections).
const GLYPH_TILE_OPACITY = 0.12;
const PILL_OPACITY = 0.14;
const GLYPH_TILE_SIZE = 40;

/**
 * The menu's next-prayer hero (screens/frames/menu, #MenuSections): a full-width green card with the caption, the next
 * prayer's name, its clock time and a pill with the time left. Without a location it shows «الصلاة» and a neutral line.
 * It owns the minute clock, so the tick re-renders this card and not the menu. Opens the Salah screen through `onPress`.
 */
export function MenuSalahCard({
  caption,
  icon,
  onPress,
  testID = 'menu-card-salah',
}: {
  caption: string;
  icon: IconName;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const now = useNow(MENU_SALAH_TICK_MS);
  const { coords } = usePrayerLocation();
  const times = useTodayTimes(coords, now);
  const next = useNextPrayer(times, coords, now);
  const known = next !== null && coords !== null && isTime(next.time);

  const title = known ? t(`home.salah.${next.name}`) : t('menu.salah.title');
  const time = known ? prayerClock(next.time, locale) : undefined;
  const remaining = known ? remainingLabel(minutesUntil(next.time, now), locale, t) : undefined;
  const preview = known ? t('menu.salah.preview', { remaining, time }) : t('menu.salah.noLocation');
  const underlay = (opacity: number) => (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.onBrandSurface, borderRadius: theme.radius.pill, opacity }]}
    />
  );

  return (
    <Pressable
      accessibilityHint={t('menu.card.hint', { title })}
      accessibilityLabel={[caption, title, preview].join(', ')}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: theme.colors.brandSurface,
        borderRadius: theme.radius.hero,
        gap: theme.space[2],
        opacity: pressed ? theme.opacity.pressed : 1,
        padding: theme.space[5],
      })}
      testID={testID}
    >
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[2] }}>
        <View
          style={{
            alignItems: 'center',
            height: GLYPH_TILE_SIZE,
            justifyContent: 'center',
            width: GLYPH_TILE_SIZE,
          }}
        >
          {underlay(GLYPH_TILE_OPACITY)}
          <Icon color={theme.colors.goldOnBrandSurface} name={icon} size={theme.size.iconLg} />
        </View>
        <UiText style={{ color: theme.colors.onBrandSurfaceMuted }} variant="caption">
          {caption}
        </UiText>
      </View>
      <UiText tone="onBrandSurface" variant="displayMd">
        {title}
      </UiText>
      {known ? (
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[2], justifyContent: 'space-between' }}>
          <UiText testID={`${testID}-time`} tone="onBrandSurface" variant="headline">
            {time}
          </UiText>
          <View
            style={{
              paddingHorizontal: theme.space[3],
              paddingVertical: theme.space[1],
            }}
          >
            {underlay(PILL_OPACITY)}
            <UiText tone="onBrandSurface" testID={`${testID}-remaining`} variant="subhead" weight={600}>
              {remaining}
            </UiText>
          </View>
        </View>
      ) : (
        <UiText style={{ color: theme.colors.onBrandSurfaceMuted }} testID={`${testID}-preview`} variant="subhead">
          {preview}
        </UiText>
      )}
    </Pressable>
  );
}
