import { router } from 'expo-router';

import { HijriAdjustSheet } from '@/features/hijri/components/HijriAdjustSheet';

/** The Hijri adjustment sheet (`/hijri/adjust`), registered as a sheet in the root layout (screens/, #HijriAdjust). */
export default function HijriAdjustRoute() {
  return <HijriAdjustSheet onClose={() => router.back()} />;
}
