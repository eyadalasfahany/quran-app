import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { UiText } from '@/shared/ui/UiText';

import { formatKilometers } from '../data/distance';
import type { LocationSource } from '../data/location';
import type { CompassAccuracy } from '../hooks/useQiblaHeading';
import { KaabaGlyph } from './KaabaGlyph';

const ACCURACY_ICON: IconName = { ios: 'location.north.circle', android: 'explore' };
const LOCATION_ICON: IconName = { ios: 'location.fill', android: 'place' };

/**
 * The glass panel under the dial: distance to al-Masjid al-Haram, compass accuracy and
 * the location source (quran-app-screens.html, #Qibla). The screen owns placement; the
 * panel renders only with a known location, so the distance is always a number.
 */
export function QiblaMetaPanel({
  distanceKm,
  accuracy,
  locationSource,
  cityName,
  testID,
}: {
  distanceKm: number;
  accuracy: CompassAccuracy;
  locationSource: LocationSource;
  cityName?: { ar: string; en: string };
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();

  const rowStyle = {
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    gap: theme.space[3],
    minHeight: 52,
    paddingHorizontal: theme.space[4],
  };
  const dividerStyle = { borderTopColor: theme.colors.playerLine, borderTopWidth: 1 };
  const labelStyle = { color: theme.colors.playerMuted, flex: 1 };
  const valueStyle = { color: theme.colors.playerInk };

  return (
    <View
      style={{
        backgroundColor: theme.colors.playerGlassFill,
        borderColor: theme.colors.playerGlassStroke,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        // The frame's 0 8px 24px black-at-35% shadow; the glass token is the nearest shadow step.
        boxShadow: theme.shadows.glass,
      }}
      testID={testID}
    >
      <View style={rowStyle}>
        <KaabaGlyph size={theme.size.icon} />
        <UiText style={labelStyle} variant="subhead">
          {t('home.salah.qiblaScreen.distance')}
        </UiText>
        <UiText style={valueStyle} variant="subhead" weight={600}>
          {formatKilometers(distanceKm, locale)} {t('home.salah.qiblaScreen.kmUnit')}
        </UiText>
      </View>

      <View style={[rowStyle, dividerStyle]}>
        <Icon color={theme.colors.playerAccent} name={ACCURACY_ICON} size={theme.size.iconMd} />
        <UiText style={labelStyle} variant="subhead">
          {t('home.salah.qiblaScreen.accuracy')}
        </UiText>
        <UiText style={valueStyle} variant="subhead" weight={600}>
          {accuracy === 'good'
            ? t('home.salah.qiblaScreen.accuracyGood')
            : t('home.salah.qiblaScreen.accuracyPoor')}
        </UiText>
      </View>

      <View style={[rowStyle, dividerStyle]}>
        <Icon color={theme.colors.playerAccent} name={LOCATION_ICON} size={theme.size.iconMd} />
        <UiText style={labelStyle} variant="subhead">
          {t('home.salah.qiblaScreen.location')}
        </UiText>
        <UiText style={valueStyle} variant="subhead" weight={600}>
          {locationSource === 'manual' && cityName
            ? cityName[locale]
            : t('home.salah.qiblaScreen.locationAuto')}
        </UiText>
      </View>
    </View>
  );
}
