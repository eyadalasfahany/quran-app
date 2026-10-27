import { highContrast, type ColorTokens } from '@quran/design-tokens';
import { useMemo, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

import { useTheme } from '@/core/theme';

// One subscription to Increase Contrast (iOS) or high text contrast (Android), shared by every component.
let increaseContrast = false;
let subscription: { remove: () => void } | null = null;
const listeners = new Set<() => void>();

function update(enabled: boolean) {
  if (enabled === increaseContrast) {
    return;
  }
  increaseContrast = enabled;
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (subscription === null) {
    const ios = Platform.OS === 'ios';
    subscription = AccessibilityInfo.addEventListener(
      ios ? 'darkerSystemColorsChanged' : 'highTextContrastChanged',
      update,
    );
    const read = ios ? AccessibilityInfo.isDarkerSystemColorsEnabled() : AccessibilityInfo.isHighTextContrastEnabled();
    void read.then(update).catch(() => undefined);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      subscription?.remove();
      subscription = null;
    }
  };
}

export function useIncreaseContrast(): boolean {
  return useSyncExternalStore(subscribe, () => increaseContrast);
}

// The theme's colours, with the highContrast overrides for lines, muted ink and glass strokes when the
// system asks for more contrast (ADR 0012).
export function useContrastColors(): ColorTokens {
  const theme = useTheme();
  const more = useIncreaseContrast();
  return useMemo(
    () => (more ? { ...theme.colors, ...highContrast[theme.name] } : theme.colors),
    [more, theme.colors, theme.name],
  );
}
