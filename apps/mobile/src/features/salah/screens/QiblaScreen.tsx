import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { I18nManager, View, type LayoutChangeEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Href } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { useScreenInsets } from '@/core/layout/useScreenInsets';
import { useIsShortWindow } from '@/core/layout/useWindowClass';
import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui/UiText';

import { CompassCalibrationNotice } from '../components/CompassCalibrationNotice';
import { QiblaAlignedPill } from '../components/QiblaAlignedPill';
import { QiblaBearingLabel } from '../components/QiblaBearingLabel';
import { QiblaCompass } from '../components/QiblaCompass';
import { goBackOr } from '@/core/navigation/go-back';
import { QiblaIconButton } from '../components/QiblaIconButton';
import { QiblaMetaPanel } from '../components/QiblaMetaPanel';
import { QiblaNoLocation } from '../components/QiblaNoLocation';
import { dialPlacement } from '../data/dial-placement';
import { distanceToMakkah } from '../data/distance';
import { requestLocationAndArmBells } from '../data/notifications';
import { qiblaDialSize, qiblaGlowSize } from '../data/qibla-layout';
import { qiblaBearing } from '../data/prayer-times';
import { usePrayerLocation } from '../hooks';
import { useQiblaHeading } from '../hooks/useQiblaHeading';
import { useScreenActive } from '../hooks/useScreenActive';

// A left chevron, flipped in RTL — same as Settings. `chevron.backward` already
// mirrors itself, so pairing it with mirrorInRtl pointed the wrong way.
const BACK_ICON = { ios: 'chevron.left', android: 'chevron_left' } as const;
const LOCATION_ICON = { ios: 'location.fill', android: 'place' } as const;

// The success haptic fires on entering alignment, but never twice within this window: the hook's hysteresis already
// stops chatter at the edge, this stops a needle that crosses in and out of the marker from buzzing.
const ALIGNED_HAPTIC_GAP_MS = 1500;

type Area = { width: number; height: number };
const NO_AREA: Area = { width: 0, height: 0 };

/**
 * «اتجاه القبلة» (screens/, #Qibla): a live compass to Makkah on the
 * player-dark canvas. The dial is the only animation; Reduce Motion or no magnetometer
 * renders the static dial (D6), and an unset location renders the empty state.
 *
 * The dial is 336 at most and shrinks to the space it is given (ADR 0036). In a short window (a landscape phone) it sits
 * beside the bearing, status and meta panel instead of above them, so nothing scrolls off.
 */
export function QiblaScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  // Reading-direction insets, so a landscape notch clears the header and the content on either side.
  const insets = useScreenInsets();
  const short = useIsShortWindow();
  const gutter = theme.space[5];
  const gap = theme.space[4];
  const reduceMotion = useReducedMotion() ?? false;

  // The area the dial may use, measured on layout: the stage in portrait, the dial's column in a short window.
  const [dialArea, setDialArea] = useState<Area>(NO_AREA);
  const [labelsHeight, setLabelsHeight] = useState(0);
  const onDialArea = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setDialArea((previous) => (previous.width === width && previous.height === height ? previous : { width, height }));
  }, []);
  const onLabels = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setLabelsHeight((previous) => (previous === height ? previous : height));
  }, []);

  const location = usePrayerLocation();
  const coords = location.coords;
  const bearing = useMemo(() => (coords ? qiblaBearing(coords) : null), [coords]);
  const distanceKm = useMemo(() => (coords ? distanceToMakkah(coords) : null), [coords]);

  // The compass watches only when there is a bearing to point at, motion is allowed, and the screen is focused in the
  // foreground. Blur or background stops the sensors; focus starts them again.
  const active = useScreenActive();
  const compass = useQiblaHeading(bearing !== null && !reduceMotion && active, bearing);
  const { headingValue, hasHeading, accuracy, supported, awaitingLocation } = compass;
  const live = bearing !== null && hasHeading && !reduceMotion && supported;
  // The hook decides alignment (with hysteresis) on the sensor thread; the screen only shows it while the dial is live.
  const aligned = live && compass.aligned;

  // A single success haptic when the needle settles onto the marker, at most once per ALIGNED_HAPTIC_GAP_MS.
  const wasAligned = useRef(false);
  const lastHaptic = useRef<number | null>(null);
  useEffect(() => {
    if (aligned && !wasAligned.current) {
      const now = Date.now();
      if (lastHaptic.current === null || now - lastHaptic.current >= ALIGNED_HAPTIC_GAP_MS) {
        lastHaptic.current = now;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      }
    }
    wasAligned.current = aligned;
  }, [aligned]);

  const onSetLocation = async () => {
    await requestLocationAndArmBells();
    await location.refresh();
  };

  // Portrait: the dial shares the stage with the labels, so it gets the stage less the labels. A short window: the dial's
  // own column is the whole area.
  const available = short
    ? Math.min(dialArea.width, dialArea.height)
    : Math.min(dialArea.width - insets.start - insets.end - gutter * 2, dialArea.height - labelsHeight - gap);
  const dialSize = qiblaDialSize(available);
  const glowSize = qiblaGlowSize(dialSize);

  // The dial with its ambient glow. The glow is scaled to the dial and centred on it.
  const dial = (
    <View style={{ alignItems: 'center', height: dialSize, justifyContent: 'center', width: dialSize }} testID="qibla-dial">
      <View
        pointerEvents="none"
        style={dialPlacement((dialSize - glowSize) / 2, (dialSize - glowSize) / 2, glowSize, glowSize, I18nManager.isRTL, dialSize)}
        testID="qibla-glow"
      >
        <Svg height={glowSize} width={glowSize}>
          <Defs>
            <RadialGradient id="qibla-ambient" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={theme.colors.qiblaGlowBrand} />
              <Stop offset="65%" stopColor={theme.colors.qiblaGlowBrand} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={glowSize / 2} cy={glowSize / 2} r={glowSize / 2} fill="url(#qibla-ambient)" />
        </Svg>
      </View>
      <QiblaCompass
        aligned={aligned}
        bearing={bearing ?? 0}
        heading={headingValue}
        live={live}
        reduceMotion={reduceMotion}
        size={dialSize}
      />
    </View>
  );

  // The bearing and the status slot. The status slot keeps its height so the dial never jumps between states.
  const labels = (
    <View onLayout={onLabels} style={{ alignItems: 'center', gap }}>
      {bearing === null ? null : <QiblaBearingLabel bearing={bearing} />}
      <View style={{ alignItems: 'center', justifyContent: 'center', minHeight: 34 }}>
        {!supported ? (
          <UiText align="center" style={{ color: theme.colors.playerMuted }} variant="caption">
            {t('home.salah.qiblaScreen.unsupportedNote')}
          </UiText>
        ) : bearing !== null && (accuracy === 'poor' || accuracy === 'fair') ? (
          // Poor or fair compass: the notice shows whether or not the dial is live (poor holds the dial still, fair turns it).
          <CompassCalibrationNotice testID="qibla-calibrate" />
        ) : aligned ? (
          <QiblaAlignedPill testID="qibla-aligned" />
        ) : live && !awaitingLocation ? null : (
          // No live heading yet (no compass sample, or Reduce Motion): the dial is the north-up one. The copy says why.
          // While Android waits for a location fix, the waiting line is added below the north-up note.
          <View style={{ alignItems: 'center', gap: 2 }}>
            {live ? null : (
              <UiText align="center" style={{ color: theme.colors.playerMuted }} testID="qibla-north-up" variant="caption">
                {t(
                  reduceMotion
                    ? 'home.salah.qiblaScreen.northUpReduceMotion'
                    : 'home.salah.qiblaScreen.northUpNote',
                )}
              </UiText>
            )}
            {awaitingLocation ? (
              <UiText align="center" style={{ color: theme.colors.playerMuted }} testID="qibla-waiting-location" variant="caption">
                {t('home.salah.qiblaScreen.waitingLocation')}
              </UiText>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );

  const meta = (
    <QiblaMetaPanel
      accuracy={accuracy}
      cityName={location.cityName}
      distanceKm={distanceKm ?? 0}
      locationSource={location.source}
      testID="qibla-meta-panel"
    />
  );

  return (
    <View style={{ backgroundColor: theme.colors.playerBg, flex: 1 }} testID="qibla-screen">
      {/* Header: back, title and subtitle, location. */}
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: theme.space[4],
          paddingEnd: insets.end + gutter,
          paddingStart: insets.start + gutter,
          paddingTop: insets.top,
        }}
        testID="qibla-header"
      >
        <QiblaIconButton
          icon={BACK_ICON}
          label={t('home.salah.qiblaScreen.back')}
          mirrorInRtl
          onPress={() => goBackOr('/salah' as Href)}
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
      ) : short ? (
        // A short window: the dial on one side, the labels and meta panel on the other.
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            gap: gutter,
            marginBottom: Math.max(insets.bottom, theme.space[5]),
            paddingEnd: insets.end + gutter,
            paddingStart: insets.start + gutter,
          }}
          testID="qibla-row"
        >
          <View onLayout={onDialArea} style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }} testID="qibla-dial-column">
            {dial}
          </View>
          <View style={{ flex: 1, gap, justifyContent: 'center' }}>
            {labels}
            {meta}
          </View>
        </View>
      ) : (
        <>
          <View
            onLayout={onDialArea}
            style={{
              alignItems: 'center',
              flex: 1,
              gap,
              justifyContent: 'center',
              paddingEnd: insets.end + gutter,
              paddingStart: insets.start + gutter,
            }}
            testID="qibla-stage"
          >
            {dial}
            {labels}
          </View>
          <View
            style={{
              marginBottom: Math.max(insets.bottom, theme.space[5]),
              marginEnd: insets.end + gutter,
              marginStart: insets.start + gutter,
            }}
          >
            {meta}
          </View>
        </>
      )}
    </View>
  );
}
