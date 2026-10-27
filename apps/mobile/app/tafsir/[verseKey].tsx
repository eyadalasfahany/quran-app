import { Stack, useLocalSearchParams } from 'expo-router';

import { SheetContainer } from '@/features/reader/components/SheetContainer';
import { useReaderSelection } from '@/features/reader/selection';

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

export default function TafsirRoute() {
  const params = useLocalSearchParams<{ verseKey: string }>();
  const tab = useReaderSelection((state) => state.panelTab);
  return (
    <>
      <Stack.Screen options={sheetOptions} />
      <SheetContainer tab={tab === 'actions' ? 'tafsir' : tab} verseKey={routeVerseKey(params.verseKey)} />
    </>
  );
}
