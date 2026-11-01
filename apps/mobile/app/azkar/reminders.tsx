import { useLocalSearchParams } from 'expo-router';

import { AzkarRemindersScreen } from '@/features/azkar/screens/AzkarRemindersScreen';

function routeParam(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first === undefined || first.length === 0 ? undefined : first;
}

/** The Azkar reminder sheet (`/azkar/reminders?category=` or `?entry=`). Registered as a sheet in the root layout. */
export default function AzkarRemindersRoute() {
  const params = useLocalSearchParams<{ category?: string; entry?: string }>();
  return <AzkarRemindersScreen categoryId={routeParam(params.category)} entryKey={routeParam(params.entry)} />;
}
