import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { Icon, UiText, type IconName } from '@/shared/ui';

const COMPASS: IconName = { ios: 'safari', android: 'explore' };
const CHEVRON: IconName = { ios: 'chevron.right', android: 'chevron_right' };

/**
 * The «اتجاه القبلة» row under the times card: the compass chip, the bearing from true north,
 * and the chevron into the Qibla screen (screens/, #Salah → #Qibla).
 */
export function QiblaRow({
  bearing,
  onPress,
  testID = 'salah-qibla',
}: {
  /** Degrees clockwise from true north. */
  bearing: number;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const degrees = formatNumber(Math.round(bearing), locale);
  const subtitle = t('salah.qiblaRow.subtitle', { degrees });

  return (
    <Pressable
      accessibilityHint={subtitle}
      accessibilityLabel={t('salah.qiblaRow.title')}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: theme.colors.line,
        borderRadius: theme.radius.lg,
        borderWidth: theme.stroke.hairline,
        flexDirection: 'row',
        gap: theme.space[4],
        opacity: pressed ? theme.opacity.pressed : 1,
        // Frame inset ~18; ADR 0057: tokenised spacing (space[4] = 16), not a magic number.
        paddingHorizontal: theme.space[4],
        paddingVertical: theme.space[4],
      })}
      testID={testID}
    >
      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.colors.fillSecondary,
          borderRadius: theme.radius.md,
          height: theme.size.touchTarget,
          justifyContent: 'center',
          width: theme.size.touchTarget,
        }}
      >
        <Icon color={theme.colors.brand} name={COMPASS} />
      </View>
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <UiText variant="headline">{t('salah.qiblaRow.title')}</UiText>
        <UiText testID={`${testID}-subtitle`} tone="muted" variant="caption">
          {subtitle}
        </UiText>
      </View>
      <Icon color={theme.colors.inkMuted} mirrorInRtl name={CHEVRON} size={theme.size.iconMd} />
    </Pressable>
  );
}
