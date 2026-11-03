import { useLocalSearchParams } from 'expo-router';

import { DuaHadithDetailScreen } from '@/features/duas/screens/DuaHadithDetailScreen';

export default function DuaHadithDetailRoute() {
  const { duaKey } = useLocalSearchParams<{ duaKey: string }>();

  return <DuaHadithDetailScreen duaKey={typeof duaKey === 'string' ? duaKey : ''} />;
}
