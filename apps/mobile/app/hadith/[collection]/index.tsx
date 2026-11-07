import { useLocalSearchParams } from 'expo-router';

import { HadithCollectionScreen } from '@/features/hadith/screens/HadithCollectionScreen';

export default function HadithCollectionRoute() {
  const { collection } = useLocalSearchParams<{ collection: string }>();

  return <HadithCollectionScreen slug={typeof collection === 'string' ? collection : ''} />;
}
