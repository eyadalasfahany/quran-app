import { Stack } from 'expo-router';

import { SheetHost } from '@/features/reader/components/SheetHost';
import { SETTINGS_SHEET_TOP, sheetScreenOptions } from '@/features/reader/form-sheet';
import { ReaderSettingsSheet } from '@/features/reader/screens/ReaderSettingsSheet';

export default function ReaderSettingsRoute() {
  return (
    <>
      <Stack.Screen options={sheetScreenOptions} />
      <SheetHost topGap={SETTINGS_SHEET_TOP}>
        <ReaderSettingsSheet />
      </SheetHost>
    </>
  );
}
