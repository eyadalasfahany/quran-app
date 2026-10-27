import { Stack, useLocalSearchParams } from 'expo-router';

import { sheetScreenOptions } from '@/features/reader/form-sheet';
import { AyahSheetScreen } from '@/features/reader/screens/AyahSheetScreen';

function routeVerseKey(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

export default function AyahRoute() {
  const params = useLocalSearchParams<{ verseKey: string }>();
  return (
    <>
      <Stack.Screen options={sheetScreenOptions} />
      <AyahSheetScreen initialTab="actions" verseKey={routeVerseKey(params.verseKey)} />
    </>
  );
}
