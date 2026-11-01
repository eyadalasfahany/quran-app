import { Stack, useLocalSearchParams } from 'expo-router';

import { sheetScreenOptions } from '@/features/reader/form-sheet';
import { AzkarDetailsScreen } from '@/features/azkar/screens/AzkarDetailsScreen';

function routeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

export default function AzkarDetailsRoute() {
  const params = useLocalSearchParams<{ entryKey: string }>();
  return (
    <>
      <Stack.Screen options={sheetScreenOptions} />
      <AzkarDetailsScreen entryKey={routeParam(params.entryKey)} />
    </>
  );
}
