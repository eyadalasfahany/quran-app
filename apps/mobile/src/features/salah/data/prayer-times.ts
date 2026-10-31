import { CalculationMethod, Madhab, PrayerTimes, Coordinates, Qibla } from 'adhan';

export interface PrayerTimesOutput {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
}

export const timesFor = (
  date: Date,
  coords: { lat: number; lng: number },
): PrayerTimesOutput => {
  const coordinates = new Coordinates(coords.lat, coords.lng);
  const params = CalculationMethod.UmmAlQura();
  params.madhab = Madhab.Shafi;
  const prayerTimes = new PrayerTimes(coordinates, date, params);

  return {
    fajr: prayerTimes.fajr,
    sunrise: prayerTimes.sunrise,
    dhuhr: prayerTimes.dhuhr,
    asr: prayerTimes.asr,
    maghrib: prayerTimes.maghrib,
    isha: prayerTimes.isha,
  };
};

export const qiblaBearing = (coords: { lat: number; lng: number }): number => {
  return Qibla(new Coordinates(coords.lat, coords.lng));
};

export type NextPrayerName = Exclude<keyof PrayerTimesOutput, 'sunrise'>;

export const nextPrayer = (
  times: PrayerTimesOutput,
  now: Date,
  coords: { lat: number; lng: number },
): { name: NextPrayerName; time: Date } | null => {
  // الشروق is a time marker, not a صلاة — the hero counts down to the next obligatory prayer only.
  const prayerNames = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

  for (const name of prayerNames) {
    if (times[name] && times[name].getTime() > now.getTime()) {
      return { name, time: times[name] };
    }
  }

  // If all prayers for today have passed, return tomorrow's Fajr
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowTimes = timesFor(tomorrow, coords);
  return { name: 'fajr', time: tomorrowTimes.fajr };
};

// The prayer whose time has most recently passed — the start of the interval the hero's progress bar measures.
// Yesterday's isha answers "before fajr", so the bar spans the night rather than jumping.
export const prevPrayer = (
  times: PrayerTimesOutput,
  now: Date,
  coords: { lat: number; lng: number },
): { name: NextPrayerName; time: Date } => {
  const prayerNames = ['isha', 'maghrib', 'asr', 'dhuhr', 'fajr'] as const;

  for (const name of prayerNames) {
    if (times[name].getTime() <= now.getTime()) {
      return { name, time: times[name] };
    }
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayTimes = timesFor(yesterday, coords);
  return { name: 'isha', time: yesterdayTimes.isha };
};

// Haversine formula to calculate great-circle distance between two points on a sphere
export const distanceToMakkahKm = (coords: { lat: number; lng: number }): number => {
  const R = 6371; // Radius of Earth in kilometers
  const makkahLat = 21.4225;
  const makkahLng = 39.8262;

  const toRadians = (deg: number) => deg * (Math.PI / 180);

  const dLat = toRadians(makkahLat - coords.lat);
  const dLng = toRadians(makkahLng - coords.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coords.lat)) *
      Math.cos(toRadians(makkahLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
