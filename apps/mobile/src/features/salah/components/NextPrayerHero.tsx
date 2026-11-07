import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Rosette, UiText } from '@/shared/ui';

import { ScenePhoto } from './ScenePhoto';

const HERO_PHOTO = require('../../../../assets/salah/hero-sunset.jpg');
// The frames' hero crop (screens/, #Salah): the sunset sits just above centre.
const HERO_FOCUS_Y = 0.45;
const ORNAMENT = { offset: -40, size: 180 } as const;
const TRACK_HEIGHT = 4;

/**
 * The green hero card: the next obligatory prayer over the sunset photo, the place line
 * («٥:٤٧ · مكة المكرمة · تلقائي»), and the gold interval progress with the ticking countdown.
 */
export function NextPrayerHero({
  prayerName,
  time,
  city,
  sourceLabel,
  remaining,
  progress,
  testID = 'salah-hero',
}: {
  /** Localized prayer name («المغرب»). */
  prayerName: string;
  /** Formatted prayer time («٥:٤٧»). */
  time: string;
  /** Manual city name; omitted under automatic location, which knows no city. */
  city?: string;
  /** «تلقائي» / «يدوي». */
  sourceLabel: string;
  /** «١:٢٣» — what the countdown still has to run. */
  remaining: string;
  /** Fraction of the current prayer interval that has passed, 0–1. */
  progress: number;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const place = [time, city, sourceLabel].filter(Boolean).join(' · ');
  const fraction = Math.min(1, Math.max(0, progress));
  const track = { borderRadius: theme.radius.progress, height: TRACK_HEIGHT };
  const accessibilityLabel = t('common.a11yPair', {
    label: `${t('salah.next')}: ${prayerName} ${time}`,
    title: t('salah.remaining', { time: remaining }),
  });

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessible
      style={{
        backgroundColor: theme.colors.brandSurface,
        borderRadius: theme.radius.hero,
        gap: theme.space[2],
        overflow: 'hidden',
        padding: theme.size.cardPadding,
      }}
      testID={testID}
    >
      <ScenePhoto focusY={HERO_FOCUS_Y} source={HERO_PHOTO} testID={`${testID}-photo`} />
      <View
        pointerEvents="none"
        style={{ backgroundColor: theme.colors.salahHeroVeil, bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 }}
        testID="salah-hero-veil"
      />
      <View
        pointerEvents="none"
        style={{ backgroundColor: theme.colors.salahHeroVeilLower, bottom: 0, height: '45%', left: 0, position: 'absolute', right: 0 }}
        testID="salah-hero-veil-lower"
      />
      <Rosette
        color={theme.colors.goldOnBrandSurface}
        drawKey="salah-hero"
        size={ORNAMENT.size}
        style={{ end: ORNAMENT.offset, opacity: theme.opacity.ornament, position: 'absolute', top: ORNAMENT.offset }}
        testID={`${testID}-rosette`}
      />
      <UiText tone="onBrandMuted" variant="caption" weight={500}>
        {t('salah.next')}
      </UiText>
      <UiText testID={`${testID}-name`} tone="onBrand" variant="displayLg">
        {prayerName}
      </UiText>
      <UiText testID={`${testID}-place`} tone="onBrandMuted" variant="subhead">
        {place}
      </UiText>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[3], marginTop: theme.space[3] }}>
        <View style={[track, { flex: 1, flexDirection: 'row', overflow: 'hidden' }]} testID={`${testID}-track`}>
          <View
            style={[
              track,
              { backgroundColor: theme.colors.onBrandSurface, opacity: 0.2, bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
            ]}
          />
          <View
            style={[track, { backgroundColor: theme.colors.goldOnBrandSurface, width: `${fraction * 100}%` }]}
            testID={`${testID}-progress`}
          />
        </View>
        <UiText testID={`${testID}-remaining`} tone="onBrand" variant="caption" weight={600}>
          {t('salah.remaining', { time: remaining })}
        </UiText>
      </View>
    </View>
  );
}
