import { useLocalSearchParams } from 'expo-router';

import { SeerahEventScreen } from '@/features/seerah/screens/SeerahEventScreen';

export default function SeerahEventRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <SeerahEventScreen eventId={id} />;
}
