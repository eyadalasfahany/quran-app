declare module 'suncalc' {
  export type SunCalcTimes = {
    sunrise: Date;
    sunset: Date;
    sunriseEnd: Date;
    sunsetStart: Date;
    dawn: Date;
    dusk: Date;
    nauticalDawn: Date;
    nauticalDusk: Date;
    night: Date;
    nightEnd: Date;
    goldenHour: Date;
    goldenHourEnd: Date;
    solarNoon: Date;
    nadir: Date;
  };

  export function getTimes(date: Date, lat: number, lng: number, height?: number, utcOffset?: number): SunCalcTimes;
  export function getMoonTimes(date: Date, lat: number, lng: number, utcOffset?: number): {
    rise: Date | null;
    set: Date | null;
    alwaysUp?: boolean;
    alwaysDown?: boolean;
  };
  export function getMoonPosition(date: Date, lat: number, lng: number): {
    azimuth: number;
    altitude: number;
    distance: number;
    parallacticAngle: number;
  };
  export function getMoonIllumination(date?: Date): {
    fraction: number;
    phase: number;
    angle: number;
    waxing: boolean;
  };
  export function getPosition(date: Date, lat: number, lng: number): { azimuth: number; altitude: number };
}
