import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui/UiText';

import { CompassCalibrationNotice } from '../components/CompassCalibrationNotice';
import { QiblaAlignedPill } from '../components/QiblaAlignedPill';
import { QiblaBearingLabel } from '../components/QiblaBearingLabel';
import { QiblaCompass } from '../components/QiblaCompass';
import { QiblaIconButton } from '../components/QiblaIconButton';
import { QiblaMetaPanel } from '../components/QiblaMetaPanel';
import { QiblaNoLocation } from '../components/QiblaNoLocation';
import { distanceToMakkah } from '../data/distance';
import { requestLocationPermissions } from '../data/location';
import { qiblaBearing } from '../data/prayer-times';
import { usePrayerLocation } from '../hooks';
import { normalize180, useQiblaHeading } from '../hooks/useQiblaHeading';

// Back points left in LTR and right in RTL; mirrorInRtl flips the glyph.
const BACK_ICON = { ios: 'chevron.backward', android: 'arrow_back' } as const;
const LOCATION_ICON = { ios: 'location.fill', android: 'place' } as const;

// Needle within ±3° of the marker counts as facing the qibla (step brief).
const ALIGNED_TOLERANCE_DEGREES = 3;

/**
 * «اتجاه القبلة» (quran-app-screens.html, #Qibla): a live compass to Makkah on the
 * player-dark canvas. The dial is the only animation; Reduce Motion or no magnetometer
 * renders the static dial (D6), and an unset location renders the empty state.
 */
export function QiblaScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion() ?? false;

  const location = usePrayerLocation();
  const coords = location.coords;
  const bearing = useMemo(() => (coords ? qiblaBearing(coords) : null), [coords]);
  const distanceKm = useMemo(() => (coords ? distanceToMakkah(coords) : null), [coords]);

  // The compass watches only when there is a bearing to point at and motion is allowed.
  const { heading, accuracy, supported } = useQiblaHeading(bearing !== null && !reduceMotion);
  const live = bearing !== null && heading !== null && !reduceMotion && supported;
  const aligned =
    live && accuracy === 'good' && Math.abs(normalize180(bearing - heading)) <= ALIGNED_TOLERANCE_DEGREES;

  // A single success haptic when the needle settles onto the marker.
  const wasAligned = useRef(false);
  useEffect(() => {
    if (aligned && !wasAligned.current) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    wasAligned.current = aligned;
  }, [aligned]);

  const onSetLocation = async () => {
    await requestLocationPermissions();
    await location.refresh();
  };

  return (
    <View style={{ backgroundColor: theme.colors.playerBg, flex: 1 }} testID="qibla-screen">
      {/* The ambient brand glow behind the instrument. */}
      <View
        pointerEvents="none"
        style={{ height: 480, left: '50%', marginLeft: -240, position: 'absolute', top: 84, width: 480 }}
      >
        <Svg height={480} width={480}>
          <Defs>
            <RadialGradient id="qibla-ambient" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={theme.colors.qiblaGlowBrand} />
              <Stop offset="65%" stopColor={theme.colors.qiblaGlowBrand} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={240} cy={240} r={240} fill="url(#qibla-ambient)" />
        </Svg>
      </View>

      {/* Header: back, title and subtitle, location. */}
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: theme.space[4],
          paddingHorizontal: theme.space[5],
          paddingTop: insets.top,
        }}
      >
        <QiblaIconButton
          icon={BACK_ICON}
          label={t('home.salah.qiblaScreen.back')}
          mirrorInRtl
          onPress={() => router.back()}
          testID="qibla-back"
        />
        <View style={{ alignItems: 'center', flex: 1, gap: 2 }}>
          <UiText style={{ color: theme.colors.playerInk }} variant="headline">
            {t('home.salah.qiblaScreen.title')}
          </UiText>
          <UiText style={{ color: theme.colors.playerMuted }} variant="label" weight={400}>
            {t('home.salah.qiblaScreen.subtitle')}
          </UiText>
        </View>
        <QiblaIconButton
          icon={LOCATION_ICON}
          label={t('home.salah.qiblaScreen.locationA11y')}
          onPress={() => void onSetLocation()}
          testID="qibla-location"
        />
      </View>

      {coords === null || bearing === null || distanceKm === null ? (
        <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
          <QiblaNoLocation onSetLocation={() => void onSetLocation()} testID="qibla-no-location" />
        </View>
      ) : (
        <>
          <View
            style={{
              alignItems: 'center',
              flex: 1,
              gap: theme.space[4],
              justifyContent: 'center',
              paddingHorizontal: theme.space[5],
            }}
          >
            <QiblaCompass
              aligned={aligned}
              bearing={bearing}
              heading={live ? heading : null}
              reduceMotion={reduceMotion}
            />
            <QiblaBearingLabel bearing={bearing} />
            {/* The status slot keeps its height so the dial never jumps between states. */}
            <View style={{ alignItems: 'center', justifyContent: 'center', minHeight: 34 }}>
              {!supported ? (
                <UiText align="center" style={{ color: theme.colors.playerMuted }} variant="caption">
                  {t('home.salah.qiblaScreen.unsupportedNote')}
                </UiText>
              ) : live && accuracy === 'poor' ? (
                <CompassCalibrationNotice testID="qibla-calibrate" />
              ) : aligned ? (
                <QiblaAlignedPill testID="qibla-aligned" />
              ) : null}
            </View>
          </View>
          <View
            style={{
              marginBottom: Math.max(insets.bottom, theme.space[5]),
              marginHorizontal: theme.space[5],
            }}
          >
            <QiblaMetaPanel
              accuracy={accuracy}
              cityName={location.cityName}
              distanceKm={distanceKm}
              locationSource={location.source}
              testID="qibla-meta-panel"
            />
          </View>
        </>
      )}
    </View>
  );
}
