import { useTranslation } from 'react-i18next';

import { formatNumber } from '@/core/i18n/numbers';
import { useLocale } from '@/core/i18n/useLocale';
import { useGlass, useTheme } from '@/core/theme';
import { GlassSurface } from '@/shared/ui/GlassSurface';

import { RANGE_ICON, REPEAT_ICON, SLEEP_ICON, SPEED_ICON } from './player-icons';
import { PlayerOptionButton } from './PlayerOptionButton';

// The bottom glass group: repeat, the ayah range, speed and the sleep timer. Until steps 5 and later, every item
// is disabled and shows its default label. Glass is the native material when it is on; otherwise the bar takes
// the frame's player glass tokens, not the theme's fallback, so it stays dark on the dark player screen.
export function PlayerOptionsBar({ versesCount, speed = 1 }: { versesCount: number; speed?: number }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const nativeGlass = useGlass();
  const rangeLabel = t('player.options.range', { from: formatNumber(1, locale), to: formatNumber(versesCount, locale) });

  return (
    <GlassSurface
      radius="xl"
      style={[
        { flexDirection: 'row', gap: 4, padding: 6 },
        nativeGlass
          ? null
          : { backgroundColor: theme.colors.playerGlassFill, borderColor: theme.colors.playerGlassStroke },
      ]}
      testID="player-options"
    >
      <PlayerOptionButton
        accessibilityLabel={t('player.options.repeatLabel')}
        disabled
        icon={REPEAT_ICON}
        label={t('player.options.repeat')}
        onPress={() => undefined}
        testID="player-option-repeat"
      />
      <PlayerOptionButton
        accessibilityLabel={rangeLabel}
        disabled
        icon={RANGE_ICON}
        label={rangeLabel}
        onPress={() => undefined}
        testID="player-option-range"
      />
      <PlayerOptionButton
        accessibilityLabel={t('player.options.speed', { rate: formatNumber(speed, locale) })}
        disabled
        icon={SPEED_ICON}
        label={t('player.options.speed', { rate: formatNumber(speed, locale) })}
        onPress={() => undefined}
        testID="player-option-speed"
      />
      <PlayerOptionButton
        accessibilityLabel={t('player.options.sleep')}
        disabled
        icon={SLEEP_ICON}
        label={t('player.options.sleep')}
        onPress={() => undefined}
        testID="player-option-sleep"
      />
    </GlassSurface>
  );
}
