import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

export type CompassAccuracy = 'good' | 'poor' | 'unavailable';

/** Normalize an angle into −180…180 so the needle always takes the shortest turn. */
export function normalize180(angle: number): number {
  return ((((angle + 180) % 360) + 360) % 360) - 180;
}

/** The signed shortest turn between two headings, in −180…180. */
export function shortestTurn(from: number, to: number): number {
  return normalize180(to - from);
}

/**
 * The needle's target on the fixed north-referenced dial: `bearing − heading`,
 * normalized so it always takes the shortest turn (no 350° swings through 0°).
 */
export function needleAngleFor(bearing: number, heading: number): number {
  return normalize180(bearing - heading);
}

// ~10 Hz, per the step brief; faster updates only make the spring churn.
const THROTTLE_MS = 100;

/**
 * Watches the device compass while `enabled` (coords known and motion allowed — the
 * screen decides both). No permission prompt here: the screen owns location permission,
 * and the network is never on the path of a tap. Devices without a magnetometer (and
 * some Android emulators) throw from watchHeadingAsync, which flips `supported` to false
 * so the screen can fall back to the static dial with the unsupported note (D6).
 */
export function useQiblaHeading(enabled: boolean) {
  const [heading, setHeading] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<CompassAccuracy>('unavailable');
  const [supported, setSupported] = useState(true);
  const lastUpdate = useRef(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    const start = async () => {
      try {
        subscription = await Location.watchHeadingAsync((event) => {
          const now = Date.now();
          if (now - lastUpdate.current < THROTTLE_MS) {
            return;
          }
          lastUpdate.current = now;

          if (event.trueHeading < 0) {
            // iOS reports −1 while the compass is uncalibrated or unavailable.
            setAccuracy('poor');
            return;
          }
          setHeading(event.trueHeading);
          // Some Android devices omit accuracy; a live heading then reads as good.
          setAccuracy(
            event.accuracy === undefined || event.accuracy === null
              ? 'good'
              : event.accuracy < 0 || event.accuracy > 20
                ? 'poor'
                : 'good',
          );
        });
        if (cancelled) {
          subscription?.remove();
        }
      } catch {
        if (!cancelled) {
          setSupported(false);
        }
      }
    };
    void start();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [enabled]);

  return { heading, accuracy, supported };
}
