import { Stack, useLocalSearchParams } from 'expo-router';

import { sheetScreenOptions } from '@/features/reader/form-sheet';
import { useReaderSelection } from '@/features/reader/selection';
import { AyahSheetScreen } from '@/features/reader/screens/AyahSheetScreen';

function routeVerseKey(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

export default function TafsirRoute() {
  const params = useLocalSearchParams<{ verseKey: string }>();
  const tab = useReaderSelection((state) => state.panelTab);
  return (
    <>
      <Stack.Screen options={sheetScreenOptions} />
      <AyahSheetScreen initialTab={tab === 'actions' ? 'tafsir' : tab} verseKey={routeVerseKey(params.verseKey)} />
    </>
  );
}
