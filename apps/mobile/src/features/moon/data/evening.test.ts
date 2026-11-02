import { buildMoonEvening, sightingEveningForDate, utcOffsetMinutesEast } from './evening';
import { hijriMonth } from '@/features/hijri/data/month';
import { findNextConjunction, findPreviousConjunction } from './conjunction';

const MAKKAH = { lat: 21.4225, lng: 39.8262 };
const SYNODIC_MS = 29.530588 * 86_400_000;

describe('buildMoonEvening: the evening facts', () => {
  it('takes the conjunction before the evening sunset and the age at that sunset from it', () => {
    const now = new Date(2026, 10, 9, 12, 0);
    const context = buildMoonEvening(now, MAKKAH.lat, MAKKAH.lng, 0);
    expect(context).not.toBeNull();
    const { evening, times } = context!;

    expect(evening.conjunction.getTime()).toBe(findPreviousConjunction(times.sunset).getTime());
    expect(evening.conjunction.getTime()).toBeLessThanOrEqual(times.sunset.getTime());
    expect(evening.ageAtSunsetMs).toBe(times.sunset.getTime() - evening.conjunction.getTime());
    expect(evening.ageAtSunsetMs).toBeGreaterThan(0);
    expect(evening.ageAtSunsetMs).toBeLessThan(SYNODIC_MS);
  });

  it('keeps the civil day of the evening at local noon', () => {
    const context = buildMoonEvening(new Date(2026, 10, 9, 12, 0), MAKKAH.lat, MAKKAH.lng, 0);
    const day = context!.evening.civilDay;
    expect(day.getFullYear()).toBe(2026);
    expect(day.getHours()).toBe(12);
  });
});

describe('sightingEveningForDate: the evening after the month-ending conjunction', () => {
  it('never evaluates a sunset before the conjunction that ends the month (1447–1449, Makkah)', () => {
    let checked = 0;
    for (let year = 1447; year <= 1449; year += 1) {
      for (let monthNumber = 1; monthNumber <= 12; monthNumber += 1) {
        const month = hijriMonth(year, monthNumber, 0);
        if (!month) {
          continue;
        }
        const day15 = month.days[14]!.gregorian;
        const location = { ...MAKKAH, utcOffsetMinutes: utcOffsetMinutesEast(day15) };
        const evening = sightingEveningForDate(day15, 0, location)!;
        const conjunction = findNextConjunction(day15);

        // After the conjunction, and no later than the first sunset after it or day 29's own sunset.
        expect(evening.sunset.getTime()).toBeGreaterThan(conjunction.getTime());
        const day29 = month.days[Math.min(28, month.length - 1)]!.gregorian;
        const sameDayAs29 = evening.civilDay.toDateString() === day29.toDateString();
        expect(sameDayAs29 || evening.sunset.getTime() - conjunction.getTime() < 86_400_000).toBe(true);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(30);
  });
});

describe('buildMoonEvening: the phase is the sighting evening’s', () => {
  it('gives the illumination at that sunset and the conjunction after it, not those of the current moment', () => {
    // 2 Nov 2026 is a waning moon (~40% lit); the sighting evening is after the 9 Nov conjunction.
    const context = buildMoonEvening(new Date(2026, 10, 2, 12, 0), MAKKAH.lat, MAKKAH.lng, 0)!;
    const { phase, times, evening } = context;

    expect(phase.previousConjunction.getTime()).toBe(evening.conjunction.getTime());
    expect(phase.nextConjunction.getTime()).toBeGreaterThan(times.sunset.getTime());
    expect(phase.nextConjunction.getTime() - evening.conjunction.getTime()).toBeGreaterThan(29 * 86_400_000);
    // A young crescent: a few percent lit at most, waxing.
    expect(phase.illumination).toBeLessThan(0.1);
    expect(phase.waxing).toBe(true);
  });
});
