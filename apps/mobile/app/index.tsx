import { Redirect } from 'expo-router';

import { isOnboardingComplete } from '@/features/onboarding/onboarding-state';

export default function Index() {
  if (!isOnboardingComplete()) {
    return <Redirect href="/(onboarding)/language" />;
  }
  return <Redirect href="/(main)/(home)" />;
}
