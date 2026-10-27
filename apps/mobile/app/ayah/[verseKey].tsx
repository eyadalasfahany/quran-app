import { Stack, useLocalSearchParams } from 'expo-router';

import { SheetContainer } from '@/features/reader/components/SheetContainer';

const sheetOptions = {
  headerShown: false,
  presentation: 'formSheet' as const,
  sheetAllowedDetents: [0.5, 1],
  sheetGrabberVisible: true,
};

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
      <Stack.Screen options={sheetOptions} />
      <SheetContainer tab="actions" verseKey={routeVerseKey(params.verseKey)} />
    </>
  );
}
