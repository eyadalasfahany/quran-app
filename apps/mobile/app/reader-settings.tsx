import { Stack } from 'expo-router';

import { SheetHost } from '@/features/reader/components/SheetHost';
import { sheetScreenOptions } from '@/features/reader/form-sheet';
import { ReaderSettingsSheet } from '@/features/reader/screens/ReaderSettingsSheet';

export default function ReaderSettingsRoute() {
  return (
    <>
      <Stack.Screen options={sheetScreenOptions} />
      <SheetHost>
        <ReaderSettingsSheet />
      </SheetHost>
    </>
  );
}
