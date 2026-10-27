import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// True only for native Liquid Glass. Unavailable platforms and Reduce Transparency
// stay on the solid fallback. Starts reduced so glass never flashes before the setting is read.
export function useGlass(): boolean {
  const available = isLiquidGlassAvailable();
  const [reduceTransparency, setReduceTransparency] = useState(true);

  useEffect(() => {
    let active = true;
    const subscription = AccessibilityInfo.addEventListener('reduceTransparencyChanged', (enabled) => {
      active = false;
      setReduceTransparency(enabled);
    });

    void AccessibilityInfo.isReduceTransparencyEnabled()
      .then((enabled) => {
        if (active) {
          setReduceTransparency(enabled);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return available && !reduceTransparency;
}
