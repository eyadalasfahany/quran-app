import { storage, storageKeys } from '@/core/storage/mmkv';

import { completeOnboarding, isOnboardingComplete } from './onboarding-state';

describe('onboarding-state', () => {
  beforeEach(() => {
    storage.remove(storageKeys.onboardingCompleted);
    storage.remove(storageKeys.readerLastVerseKey);
    storage.remove(storageKeys.audioReciterId);
  });

  it('is incomplete until marked done', () => {
    expect(isOnboardingComplete()).toBe(false);
    completeOnboarding();
    expect(isOnboardingComplete()).toBe(true);
  });

  it('treats existing reader or audio prefs as complete', () => {
    storage.set(storageKeys.readerLastVerseKey, '1:1');
    expect(isOnboardingComplete()).toBe(true);
  });
});
