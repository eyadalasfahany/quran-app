import { Stack } from 'expo-router';

import { ReaderSettingsSheet } from '@/features/reader/screens/ReaderSettingsSheet';

const sheetOptions = {
  headerShown: false,
  presentation: 'formSheet' as const,
  sheetAllowedDetents: [0.5, 1],
  sheetGrabberVisible: true,
};

export default function ReaderSettingsRoute() {
  return (
    <>
      <Stack.Screen options={sheetOptions} />
      <ReaderSettingsSheet />
    </>
  );
}
