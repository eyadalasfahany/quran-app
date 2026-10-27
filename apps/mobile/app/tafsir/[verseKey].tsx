import { router, Stack, useLocalSearchParams } from 'expo-router';

import { SheetContainer } from '@/features/reader/components/SheetContainer';
import { SheetHost } from '@/features/reader/components/SheetHost';
import { TAFSIR_SHEET_TOP, sheetScreenOptions } from '@/features/reader/form-sheet';
import { useReaderSelection } from '@/features/reader/selection';

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
      <SheetHost topGap={TAFSIR_SHEET_TOP}>
        <SheetContainer
          onClose={() => router.back()}
          tab={tab === 'actions' ? 'tafsir' : tab}
          verseKey={routeVerseKey(params.verseKey)}
        />
      </SheetHost>
    </>
  );
}
