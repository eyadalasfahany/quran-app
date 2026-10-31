import * as Location from 'expo-location';
import { router, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { useLocale } from '@/core/i18n';
import { formatWeekdayDate } from '@/core/i18n/dates';
import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { useMiniPlayerVisible } from '@/features/audio/hooks/useMiniPlayerVisible';
import { MINI_PLAYER_TABS_FOOTPRINT } from '@/features/audio/mini-player-metrics';
import { EmptyState, Screen, type IconName } from '@/shared/ui';

import { LocationPickerSheet } from '../components/LocationPickerSheet';
import { NextPrayerHero } from '../components/NextPrayerHero';
import { PrayerBell } from '../components/PrayerBell';
import { PrayerTimeRow } from '../components/PrayerTimeRow';
import { PrayerTimesCard } from '../components/PrayerTimesCard';
import { QiblaRow } from '../components/QiblaRow';
import { SalahDateHeader } from '../components/SalahDateHeader';
import { requestLocationPermissions, setAutoLocation, setManualLocation } from '../data/location';
import { prevPrayer, qiblaBearing, type NextPrayerName, type PrayerTimesOutput } from '../data/prayer-times';
import { formatPrayerTime, formatRemaining } from '../data/time-format';
import { useHijriDate, useNextPrayer, useNow, usePrayerLocation, useTodayTimes } from '../hooks';

const EMPTY_LOCATION: IconName = { ios: 'location.slash', android: 'location_off' };

// The six lines of the times card, with the frames' scene crop for each (quran-app-screens.html, #Salah).
const ROWS = [
  { key: 'fajr', scene: require('../../../../assets/salah/fajr.jpg'), focusY: 0.8, prayer: 'fajr' },
  { key: 'sunrise', scene: require('../../../../assets/salah/shurouq.jpg'), focusY: 0.53, prayer: null },
  { key: 'dhuhr', scene: require('../../../../assets/salah/dhuhr.jpg'), focusY: 0.05, prayer: 'dhuhr' },
  { key: 'asr', scene: require('../../../../assets/salah/asr.jpg'), focusY: 0.43, prayer: 'asr' },
  { key: 'maghrib', scene: require('../../../../assets/salah/maghrib.jpg'), focusY: 0.57, prayer: 'maghrib' },
  { key: 'isha', scene: require('../../../../assets/salah/isha.jpg'), focusY: 0.39, prayer: 'isha' },
] as const satisfies readonly { key: keyof PrayerTimesOutput; scene: number; focusY: number; prayer: NextPrayerName | null }[];

/**
 * The الصلاة tab: the date header, the next-prayer hero, the six times over their scenes,
 * and the qibla row (quran-app-screens.html, #Salah). Composition only — every block is a
 * feature component; the ticking `now` flows down so the countdown and "today" stay in step.
 */
export function SalahScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const now = useNow(1000);
  const { source, coords, cityId, cityName, permissionStatus, refresh } = usePrayerLocation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const miniShown = useMiniPlayerVisible('tabs');

  // The tab is the permission's context: ask on first visit rather than from a cold modal.
  useEffect(() => {
    if (source === 'auto' && permissionStatus === Location.PermissionStatus.UNDETERMINED) {
      void requestLocationPermissions().then(() => refresh());
    }
  }, [source, permissionStatus, refresh]);

  const times = useTodayTimes(coords, now);
  const next = useNextPrayer(times, coords, now);
  const hijri = useHijriDate(now);
  const previous = useMemo(() => (times && coords ? prevPrayer(times, now, coords) : null), [times, coords, now]);
  const bearing = useMemo(() => (coords ? qiblaBearing(coords) : null), [coords]);

  const subtitle = `${hijri} · ${formatWeekdayDate(now, locale)}`;
  // Still resolving the first fix (or waiting on the system prompt): hold the screen empty.
  const locating = coords === null && source === 'auto' && permissionStatus === Location.PermissionStatus.UNDETERMINED;
  const sourceLabel = t(source === 'auto' ? 'salah.sourceAuto' : 'salah.sourceManual');
  // The tabs mini bar floats over the list. The qibla row is as tall as a touch
  // target plus its vertical padding; add that on top of the bar footprint so
  // the row can scroll fully above the player and stay tappable.
  const qiblaRowClearance = theme.size.touchTarget + theme.space[4] * 2;
  const listBottomPad = theme.space[4] + (miniShown ? MINI_PLAYER_TABS_FOOTPRINT + qiblaRowClearance : 0);

  return (
    <Screen testID="screen-salah">
      <ContentColumn>
        <View style={{ flex: 1, gap: theme.size.sectionGap }}>
          <SalahDateHeader onLocationPress={() => setSheetOpen(true)} subtitle={subtitle} title={t('salah.title')} />
          {locating ? null : coords === null || times === null || next === null || previous === null || bearing === null ? (
            <View style={{ flex: 1, paddingBottom: miniShown ? MINI_PLAYER_TABS_FOOTPRINT : 0 }}>
              <EmptyState
                action={{ label: t('salah.noLocation.chooseCity'), onPress: () => setSheetOpen(true) }}
                body={t('salah.noLocation.body')}
                icon={EMPTY_LOCATION}
                testID="salah-no-location"
                title={t('salah.noLocation.title')}
              />
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ gap: theme.size.sectionGap, paddingBottom: listBottomPad }} showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} style={{ flex: 1 }} testID="screen-salah-scroll">
              <NextPrayerHero
                city={source === 'manual' ? cityName?.[locale] : undefined}
                prayerName={t(`home.salah.${next.name}`)}
                progress={(now.getTime() - previous.time.getTime()) / (next.time.getTime() - previous.time.getTime())}
                remaining={formatRemaining(next.time.getTime() - now.getTime(), locale)}
                sourceLabel={sourceLabel}
                time={formatPrayerTime(next.time, locale)}
              />
              <PrayerTimesCard>
                {ROWS.map((row, index) => (
                  <PrayerTimeRow
                    active={next.name === row.key}
                    bell={row.prayer === null ? undefined : <PrayerBell prayer={row.prayer} testID={`salah-bell-${row.prayer}`} />}
                    focusY={row.focusY}
                    key={row.key}
                    last={index === ROWS.length - 1}
                    muted={row.key === 'sunrise'}
                    name={t(`home.salah.${row.key}`)}
                    scene={row.scene}
                    testID={`salah-row-${row.key}`}
                    time={formatPrayerTime(times[row.key], locale)}
                  />
                ))}
              </PrayerTimesCard>
              <QiblaRow bearing={bearing} onPress={() => router.push('/salah/qibla' as Href)} />
            </ScrollView>
          )}
        </View>
      </ContentColumn>
      <LocationPickerSheet
        cityId={cityId}
        onClose={() => setSheetOpen(false)}
        onSelectAuto={() => {
          setAutoLocation();
          setSheetOpen(false);
          void requestLocationPermissions().then(() => refresh());
        }}
        onSelectCity={(city) => {
          setManualLocation({ id: city.id, lat: city.lat, lng: city.lng });
          setSheetOpen(false);
          refresh();
        }}
        permissionDenied={permissionStatus === Location.PermissionStatus.DENIED}
        source={source}
        visible={sheetOpen}
      />
    </Screen>
  );
}
