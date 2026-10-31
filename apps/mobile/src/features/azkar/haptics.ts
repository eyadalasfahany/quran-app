import * as Haptics from 'expo-haptics';

/** One accepted count tap (`Haptics.selectionAsync`). A device without haptics is not an error. */
export function tapHaptic(): void {
  Haptics.selectionAsync().catch(() => undefined);
}

/** A unit completed (`notificationAsync(Success)`). */
export function completeHaptic(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}
