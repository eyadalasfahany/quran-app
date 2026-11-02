import SunCalc from './suncalc';

import { findPreviousConjunction } from './conjunction';

export type MoonState = {
  phase: number;
  illumination: number;
  /** Hours since the previous new moon. */
  ageHours: number;
  waxing: boolean;
};

/** Phase, illumination, waxing flag and age since the last conjunction at `at`. */
export function moonStateAt(at: Date): MoonState {
  const { phase, fraction, waxing } = SunCalc.getMoonIllumination(at);
  const previous = findPreviousConjunction(at);
  const ageHours = (at.getTime() - previous.getTime()) / 3_600_000;
  return { phase, illumination: fraction, ageHours, waxing };
}
