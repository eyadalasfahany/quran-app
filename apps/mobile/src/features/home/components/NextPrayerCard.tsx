import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, type IconName, UiText, useContrastColors } from '@/shared/ui';

import type { NextPrayerCard as NextPrayerCardModel } from '../data/next-prayer';

const PRAYER_ICON: IconName = { ios: 'moon.stars', android: 'mosque' };
const CHEVRON: IconName = { ios: 'chevron.right', android: 'chevron_right' };
// The prayer's name is Amiri 22 (screens/, #Main). No display token has that size, so it is set here.
const NAME_SIZE = 22;
const NAME_LINE_HEIGHT = 29;
// The card pads 14 pt vertically and sets 14 pt between its parts (screens/, #Main).
const CARD_PADDING_Y = 14;

/**
 * Home's next-prayer card (screens/, #Main): a surface card, not a brand card, under «تابع القراءة». It
 * shows the prayer, its time and the time left, and opens the Salah screen. Without a location it asks for one.
 */
export function NextPrayerCard({
  card,
  onPress,
  testID = 'home-next-prayer',
}: {
  card: NextPrayerCardModel;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const caption = t('home.nextPrayer.caption');
  const label =
    card.kind === 'prayer'
      ? [caption, card.name, card.time, card.remaining].join(', ')
      : [caption, t('home.nextPrayer.noLocation')].join(', ');

  return (
    <Pressable
      accessibilityHint={t('home.nextPrayer.a11yHint')}
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: colors.line,
        borderRadius: theme.radius.lg,
        borderWidth: theme.stroke.hairline,
        flexDirection: 'row',
        gap: CARD_PADDING_Y,
        opacity: pressed ? theme.opacity.pressed : 1,
        paddingHorizontal: theme.space[4],
        paddingVertical: CARD_PADDING_Y,
      })}
      testID={testID}
    >
      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.colors.fillSecondary,
          borderRadius: theme.radius.md,
          flexShrink: 0,
          height: theme.size.touchTarget,
          justifyContent: 'center',
          width: theme.size.touchTarget,
        }}
      >
        <Icon color={theme.colors.brand} name={PRAYER_ICON} size={theme.size.icon} />
      </View>
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <UiText tone="muted" variant="caption">
          {caption}
        </UiText>
        {card.kind === 'prayer' ? (
          <>
            <View style={{ alignItems: 'baseline', flexDirection: 'row', gap: theme.space[2], justifyContent: 'space-between' }}>
              <UiText style={{ fontSize: NAME_SIZE, lineHeight: NAME_LINE_HEIGHT }} testID={`${testID}-name`} variant="displaySm">
                {card.name}
              </UiText>
              <UiText testID={`${testID}-time`} variant="headline" weight={600}>
                {card.time}
              </UiText>
            </View>
            <UiText tone="muted" variant="caption">
              {card.remaining}
            </UiText>
          </>
        ) : (
          <UiText testID={`${testID}-prompt`} variant="subhead">
            {t('home.nextPrayer.noLocation')}
          </UiText>
        )}
      </View>
      <Icon color={colors.inkMuted} mirrorInRtl name={CHEVRON} size={theme.size.iconSm} />
    </Pressable>
  );
}
