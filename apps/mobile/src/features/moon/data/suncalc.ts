import * as SunCalcModule from 'suncalc';

/** suncalc 2.x exposes named exports only; Metro default-import interop yields undefined. */
const SunCalc: typeof SunCalcModule =
  typeof SunCalcModule.getTimes === 'function'
    ? SunCalcModule
    : (SunCalcModule as { default?: typeof SunCalcModule }).default ?? SunCalcModule;

if (typeof SunCalc.getTimes !== 'function') {
  throw new Error('suncalc: getTimes is unavailable');
}

export default SunCalc;

export { getMoonIllumination, getMoonPosition, getMoonTimes, getPosition, getTimes } from 'suncalc';
