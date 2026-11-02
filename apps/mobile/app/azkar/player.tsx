import { Stack } from 'expo-router';

import { sheetScreenOptions } from '@/features/reader/form-sheet';
import { AzkarPlayerScreen } from '@/features/azkar/screens/AzkarPlayerScreen';

/** The full Azkar player (`/azkar/player`), a reader sheet pushed over the reader (ADR 0031 §8). */
export default function AzkarPlayerRoute() {
  return (
    <>
      <Stack.Screen options={sheetScreenOptions} />
      <AzkarPlayerScreen />
    </>
  );
}
