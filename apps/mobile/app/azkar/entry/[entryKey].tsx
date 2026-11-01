import { useLocalSearchParams } from 'expo-router';

import { AzkarReaderScreen } from '@/features/azkar/screens/AzkarReaderScreen';

function routeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

export default function AzkarEntryReaderRoute() {
  const params = useLocalSearchParams<{ entryKey: string }>();
  return <AzkarReaderScreen scope={{ entryKey: routeParam(params.entryKey), kind: 'entry' }} />;
}
