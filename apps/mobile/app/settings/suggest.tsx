import { Stack } from 'expo-router';

import { sheetScreenOptions } from '@/features/reader/form-sheet';
import { SuggestScreen } from '@/features/suggestions/screens/SuggestScreen';

/** «اقترح فكرة» sheet (`/settings/suggest`), opened from the Settings row (ADR 0066). */
export default function SuggestRoute() {
  return (
    <>
      <Stack.Screen options={sheetScreenOptions} />
      <SuggestScreen />
    </>
  );
}
