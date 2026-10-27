import { router, Stack, useLocalSearchParams } from 'expo-router';

import { SheetContainer } from '@/features/reader/components/SheetContainer';
import { SheetHost } from '@/features/reader/components/SheetHost';
import { AYAH_SHEET_TOP, sheetScreenOptions } from '@/features/reader/form-sheet';

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
      <SheetHost topGap={AYAH_SHEET_TOP}>
        <SheetContainer onClose={() => router.back()} tab="actions" verseKey={routeVerseKey(params.verseKey)} />
      </SheetHost>
    </>
  );
}
