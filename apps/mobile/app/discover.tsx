import { useLocalSearchParams } from 'expo-router';

import { DiscoverScreen } from '@/features/discover/screens/DiscoverScreen';

export default function DiscoverRoute() {
  const { sheet } = useLocalSearchParams<{ sheet?: string }>();
  return <DiscoverScreen openSheet={sheet === 'widget'} />;
}
