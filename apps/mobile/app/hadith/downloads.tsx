import { Stack, useLocalSearchParams } from 'expo-router';

import { parseHadithId } from '@/features/hadith/routes';
import { HadithDownloadSheetScreen } from '@/features/hadith/screens/HadithDownloadSheetScreen';
import { sheetScreenOptions } from '@/features/reader/form-sheet';
import { SheetHost } from '@/features/reader/components/SheetHost';

export default function HadithDownloadsRoute() {
  const { resource } = useLocalSearchParams<{ resource?: string }>();

  return (
    <>
      <Stack.Screen options={sheetScreenOptions} />
      <SheetHost>
        <HadithDownloadSheetScreen resourceId={parseHadithId(resource)} />
      </SheetHost>
    </>
  );
}
