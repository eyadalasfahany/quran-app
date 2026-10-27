import { useLocalSearchParams } from 'expo-router';

import { ReaderScreen } from '@/features/reader/screens/ReaderScreen';

function routeVerseKey(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

export default function ReadRoute() {
  const params = useLocalSearchParams<{ verseKey: string }>();
  return <ReaderScreen verseKey={routeVerseKey(params.verseKey)} />;
}
