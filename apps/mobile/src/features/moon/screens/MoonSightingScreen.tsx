import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { goBackOr, MENU_TAB } from '@/core/navigation/go-back';
import { ContentColumn, useIsShortWindow } from '@/core/layout';
import { formatTime } from '@/core/i18n/dates';
import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { AzkarScreenHeader } from '@/features/azkar/components/AzkarScreenHeader';
import { useHijriAdjustment } from '@/features/hijri/data/adjustment';
import { Screen, UiText } from '@/shared/ui';

import { MoonLocationPill } from '../components/MoonLocationPill';
import { MoonDisclaimer } from '../components/MoonDisclaimer';
import { MoonNoLocation } from '../components/MoonNoLocation';
import { MoonSummaryCard } from '../components/MoonSummaryCard';
import { MoonTimesCard } from '../components/MoonTimesCard';
import { VisibilityEstimateCard } from '../components/VisibilityEstimateCard';
import { buildMoonEvening } from '../data/evening';
import {
  formatConjunctionValue,
  formatEveningLabel,
  formatIlluminationPercent,
  formatMoonAge,
  formatMoonsetCompared,
  formatOdehV,
} from '../data/format';
import { useMoonLocation } from '../hooks/useMoonLocation';

/**
 * Moon sighting (quran-app-screens.html, #MoonSighting). Read-only Salah location in the header; the estimate always
 * carries the disclaimer. Times are shown in the device time zone, as the frame shows them.
 */
export function MoonSightingScreen({ now, testID = 'screen-moon-sighting' }: { now?: Date; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const short = useIsShortWindow();
  const [adjust] = useHijriAdjustment();
  const [clock] = useState(() => now ?? new Date());
  const { snapshot, pending } = useMoonLocation();

  const coords = snapshot?.coords;
  const context = useMemo(() => {
    if (!coords) {
      return null;
    }
    return buildMoonEvening(clock, coords.lat, coords.lng, adjust);
  }, [adjust, clock, coords]);

  const locationLabel =
    snapshot?.cityName?.[locale === 'ar' ? 'ar' : 'en'] ??
    t(snapshot?.source === 'auto' ? 'salah.sourceAuto' : 'salah.sourceManual');

  const header = (
    <AzkarScreenHeader
      onBack={() => goBackOr(MENU_TAB)}
      testID="moon-screen-header"
      title={t('moon.title')}
      trailing={
        coords ? (
          <MoonLocationPill label={locationLabel} onPress={() => router.push('/salah' as Href)} />
        ) : undefined
      }
    />
  );

  if (!coords) {
    if (pending) {
      return (
        <Screen testID={testID}>
          <ContentColumn gutter={theme.size.gutterHome}>{header}</ContentColumn>
        </Screen>
      );
    }
    return (
      <Screen testID={testID}>
        <ContentColumn gutter={theme.size.gutterHome}>
          {header}
          <MoonNoLocation onOpenSalah={() => router.push('/salah' as Href)} />
        </ContentColumn>
      </Screen>
    );
  }

  const estimate = context?.estimate;
  const sunset = context?.times.sunset;
  const moonset = context?.times.moonset ?? null;

  const hero = context ? (
    <MoonSummaryCard
      ageLabel={formatMoonAge(context.evening.ageAtSunsetMs, locale, t)}
      eveningLabel={formatEveningLabel(context.evening.civilDay, adjust, locale, t)}
      illumination={context.phase.illumination}
      illuminationLabel={formatIlluminationPercent(context.phase.illumination, locale)}
      waxing={context.phase.waxing}
    />
  ) : null;

  const timeRows =
    context && sunset
      ? [
          {
            key: 'conjunction',
            label: t('moon.times.conjunction'),
            value: formatConjunctionValue(context.evening.conjunction, locale, t),
          },
          {
            key: 'sunset',
            label: t('moon.times.sunset'),
            value: formatTime(sunset, locale),
          },
          {
            key: 'moonset',
            label: t('moon.times.moonset'),
            value: moonset ? formatTime(moonset, locale) : t('moon.times.unavailable'),
          },
          {
            key: 'moonsetCompared',
            label: t('moon.times.moonsetCompared'),
            value: moonset ? formatMoonsetCompared(moonset.getTime() - sunset.getTime(), locale, t) : t('moon.times.unavailable'),
          },
          {
            key: 'nextConjunction',
            label: t('moon.times.nextConjunction'),
            value: formatConjunctionValue(context.phase.nextConjunction, locale, t),
          },
        ]
      : [];
  const timesCard = timeRows.length > 0 ? <MoonTimesCard rows={timeRows} /> : null;

  const estimateCard =
    estimate !== null && estimate !== undefined ? (
      <VisibilityEstimateCard odehVLabel={formatOdehV(estimate.odehV, locale)} zone={estimate.odehZone} />
    ) : (
      <UiText style={{ color: theme.colors.inkMuted }} variant="subhead">
        {t('moon.unavailable')}
      </UiText>
    );
  const disclaimer = estimate !== null && estimate !== undefined ? <MoonDisclaimer /> : null;

  // Frame order: the evening and its times, then the estimate and its disclaimer. A short window puts them side by side.
  const body = short ? (
    <View style={{ flexDirection: 'row', gap: theme.space[3] }}>
      <View style={{ flex: 1, gap: theme.space[3] }}>
        {hero}
        {timesCard}
      </View>
      <View style={{ flex: 1, gap: theme.space[3] }}>
        {estimateCard}
        {disclaimer}
      </View>
    </View>
  ) : (
    <View style={{ gap: theme.space[3] }}>
      {hero}
      {timesCard}
      {estimateCard}
      {disclaimer}
    </View>
  );

  return (
    <Screen testID={testID}>
      <ScrollView contentContainerStyle={{ paddingBottom: theme.space[6] }}>
        <ContentColumn gutter={theme.size.gutterHome}>
          <View style={{ gap: theme.space[3], paddingTop: theme.space[2] }}>
            {header}
            {body}
            <UiText align="center" style={{ color: theme.colors.inkMuted }} variant="caption">
              {t('moon.offline')}
            </UiText>
          </View>
        </ContentColumn>
      </ScrollView>
    </Screen>
  );
}
