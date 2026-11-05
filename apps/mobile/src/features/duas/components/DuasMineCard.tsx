import { amiriNaturalLeading, typeScale } from '@quran/design-tokens';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { Rosette, UiText } from '@/shared/ui';

const ROSETTE = { offset: -40, size: 180 } as const;

/** Duas home «أدعيتي» brand card (quran-app-screens.html, #DuasHome): no progress bar. */
export function DuasMineCard({
  count,
  onPress,
  testID = 'duas-mine-card',
}: {
  count: number;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const title = t('duas.home.mineTitle');
  const countLabel = t('duas.home.mineCount', { count, number: formatNumber(count, locale) });
  const caption = `${countLabel} · ${t('duas.home.mineDeviceOnly')}`;
  const actionLabel = count === 0 ? t('duas.home.mineAdd') : t('duas.home.mineOpen');

  return (
    <Pressable
      accessibilityLabel={t('common.a11yPair', { label: t('duas.home.mineEyebrow'), title: `${title}, ${caption}` })}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: theme.colors.brandSurface,
        borderRadius: theme.radius.hero,
        gap: theme.size.stackGap,
        opacity: pressed ? theme.opacity.pressed : 1,
        overflow: 'hidden',
        padding: theme.size.cardPadding,
      })}
      testID={testID}
    >
      <Rosette
        color={theme.colors.goldOnBrandSurface}
        drawKey="duas-mine"
        size={ROSETTE.size}
        style={{ end: ROSETTE.offset, opacity: theme.opacity.ornament, position: 'absolute', top: ROSETTE.offset }}
        testID={`${testID}-rosette`}
      />
      <UiText tone="onBrandMuted" variant="caption" weight={500}>
        {t('duas.home.mineEyebrow')}
      </UiText>
      <UiText
        style={{ lineHeight: Math.round(typeScale.displayLg.size * amiriNaturalLeading) }}
        tone="onBrandSurface"
        variant="displayLg"
      >
        {title}
      </UiText>
      <UiText tone="onBrandMuted" variant="caption">
        {caption}
      </UiText>
      <View style={{ alignItems: 'flex-end', marginTop: theme.space[2] }}>
        <UiText tone="onBrandSurface" variant="caption" weight={600}>
          {actionLabel}
        </UiText>
      </View>
    </Pressable>
  );
}
