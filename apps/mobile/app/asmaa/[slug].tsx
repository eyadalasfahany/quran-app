import { useLocalSearchParams } from 'expo-router';

import { NameDetailScreen } from '@/features/names/screens/NameDetailScreen';

export default function NameDetailRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <NameDetailScreen slug={typeof slug === 'string' ? slug : ''} />;
}
