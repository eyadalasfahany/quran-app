import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { ContentColumn, useIsShortWindow } from '@/core/layout';
import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { AzkarScreenHeader } from '@/features/azkar/components/AzkarScreenHeader';
import { useHijriAdjustment } from '@/features/hijri/data/adjustment';
import { Screen, UiText } from '@/shared/ui';

import { MoonNoLocation } from '../components/MoonNoLocation';
import { MoonSummaryCard } from '../components/MoonSummaryCard';
import { MoonTimesCard } from '../components/MoonTimesCard';
import { VisibilityEstimateCard } from '../components/VisibilityEstimateCard';
import { buildMoonEvening } from '../data/evening';
import { formatAgeDays, formatIlluminationPercent, formatMoonTime, formatSignedDegrees } from '../data/format';
import { useMoonLocation } from '../hooks/useMoonLocation';

/**
 * Moon sighting (quran-app-screens.html, #MoonSighting). Read-only Salah location; estimate always carries the disclaimer.
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

  const header = (
    <AzkarScreenHeader onBack={() => router.back()} testID="moon-screen-header" title={t('moon.title')} />
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

  const locationLabel =
    snapshot?.cityName?.[locale === 'ar' ? 'ar' : 'en'] ??
    t(snapshot?.source === 'auto' ? 'salah.sourceAuto' : 'salah.sourceManual');

  const phase = context?.phase;
  const estimate = context?.estimate;

  const timeRows = context
    ? [
        {
          key: 'conjunction',
          label: t('moon.times.conjunction'),
          value: formatMoonTime(phase!.previousConjunction, locale),
        },
        {
          key: 'sunset',
          label: t('moon.times.sunset'),
          value: formatMoonTime(context.times.sunset, locale),
        },
        {
          key: 'moonset',
          label: t('moon.times.moonset'),
          value: context.times.moonset ? formatMoonTime(context.times.moonset, locale) : t('moon.times.unavailable'),
        },
      ]
    : [];

  const hero = phase ? (
    <MoonSummaryCard
      ageLabel={`${formatAgeDays(phase.ageDays, locale)} ${t('moon.summary.ageUnit')}`}
      illumination={phase.illumination}
      illuminationLabel={formatIlluminationPercent(phase.illumination, locale)}
      waxing={phase.waxing}
    />
  ) : null;

  const estimateCard =
    estimate !== null && estimate !== undefined ? (
      <VisibilityEstimateCard odehVLabel={formatSignedDegrees(estimate.odehV, locale)} zone={estimate.odehZone} />
    ) : (
      <UiText style={{ color: theme.colors.inkMuted }} variant="subhead">
        {t('moon.unavailable')}
      </UiText>
    );

  const mainRow = (
    <View style={{ flexDirection: short ? 'row' : 'column', gap: theme.space[4] }}>
      <View style={{ flex: 1, gap: theme.space[4] }}>{hero}</View>
      <View style={{ flex: 1 }}>{estimateCard}</View>
    </View>
  );

  return (
    <Screen testID={testID}>
      <ScrollView contentContainerStyle={{ paddingBottom: theme.space[6] }}>
        <ContentColumn gutter={theme.size.gutterHome}>
          <View style={{ gap: theme.space[4], paddingTop: theme.space[2] }}>
            {header}
            <UiText accessibilityLabel={t('moon.locationA11y', { label: locationLabel })} variant="subhead">
              {locationLabel}
            </UiText>
            {mainRow}
            {timeRows.length > 0 ? <MoonTimesCard rows={timeRows} /> : null}
            <UiText style={{ color: theme.colors.inkMuted }} variant="caption">
              {t('moon.offline')}
            </UiText>
          </View>
        </ContentColumn>
      </ScrollView>
    </Screen>
  );
}
