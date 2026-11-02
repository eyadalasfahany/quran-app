import * as Haptics from 'expo-haptics';

/**
 * Whether pressing a tab plays the selection tick. Only iOS, and only when the tab changes: the iOS rail (a tablet, or a
 * short phone window) is drawn by us, so it needs the feedback that UIKit gives the native tab bar. Android's bar and rail
 * stay silent (spec §12, Tab change), and a press on the tab that is already open does nothing.
 */
export function playsTabSelectionHaptic(os: string, wasFocused: boolean): boolean {
  return os === 'ios' && !wasFocused;
}

export function tabSelectionHaptic(os: string, wasFocused: boolean): void {
  if (playsTabSelectionHaptic(os, wasFocused)) {
    void Haptics.selectionAsync().catch(() => undefined);
  }
}
