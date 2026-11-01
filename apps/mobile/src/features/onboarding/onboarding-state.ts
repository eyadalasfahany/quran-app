import { storage, storageKeys } from '@/core/storage/mmkv';

export function isOnboardingComplete(): boolean {
  if (storage.getBoolean(storageKeys.onboardingCompleted) === true) {
    return true;
  }
  // Upgrades: readers who already have prefs should not see onboarding again.
  return (
    storage.contains(storageKeys.readerLastVerseKey) || storage.contains(storageKeys.audioReciterId)
  );
}

export function completeOnboarding(): void {
  storage.set(storageKeys.onboardingCompleted, true);
}
