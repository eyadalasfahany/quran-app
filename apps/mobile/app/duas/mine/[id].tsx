import { useLocalSearchParams } from 'expo-router';

import { MyDuaDetailScreen } from '@/features/duas/screens/MyDuaDetailScreen';

export default function MyDuaDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <MyDuaDetailScreen duaId={typeof id === 'string' ? id : ''} />;
}
