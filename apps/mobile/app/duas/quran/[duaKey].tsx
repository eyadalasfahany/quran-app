import { useLocalSearchParams } from 'expo-router';

import { DuaQuranDetailScreen } from '@/features/duas/screens/DuaQuranDetailScreen';

export default function DuaQuranDetailRoute() {
  const { duaKey } = useLocalSearchParams<{ duaKey: string }>();

  return <DuaQuranDetailScreen duaKey={typeof duaKey === 'string' ? duaKey : ''} />;
}
