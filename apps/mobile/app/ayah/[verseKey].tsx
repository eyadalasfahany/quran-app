import { Stack, useLocalSearchParams } from 'expo-router';

import { isSvgMushafKey } from '@/core/mushaf-pack';
import { sheetScreenOptions } from '@/features/reader/form-sheet';
import { AyahSheetScreen } from '@/features/reader/screens/AyahSheetScreen';

function routeVerseKey(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

export default function AyahRoute() {
  const params = useLocalSearchParams<{ verseKey: string; riwayah?: string }>();
  // A tap on a non-Hafs page carries its riwayah; anything else (a link, an unknown value) is Hafs.
  const riwayah = routeVerseKey(params.riwayah);
  return (
    <>
      <Stack.Screen options={sheetScreenOptions} />
      <AyahSheetScreen
        initialTab="actions"
        riwayah={isSvgMushafKey(riwayah) ? riwayah : 'hafs'}
        verseKey={routeVerseKey(params.verseKey)}
      />
    </>
  );
}
