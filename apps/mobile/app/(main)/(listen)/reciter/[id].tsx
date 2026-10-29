import { useLocalSearchParams } from 'expo-router';

import { ReciterDownloadsScreen } from '@/features/audio/screens/ReciterDownloadsScreen';

function routeResourceId(value: string | string[] | undefined): number {
  const text = Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
  const id = Number(text);
  return Number.isInteger(id) && id > 0 ? id : 0;
}

export default function ReciterRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  return <ReciterDownloadsScreen resourceId={routeResourceId(params.id)} />;
}
