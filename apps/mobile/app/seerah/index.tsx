import { useLocalSearchParams } from 'expo-router';

import { parseSeerahAge, parseSeerahView } from '@/features/seerah/routes';
import { SeerahScreen } from '@/features/seerah/screens/SeerahScreen';

export default function SeerahRoute() {
  const { view, age, place } = useLocalSearchParams<{ view?: string; age?: string; place?: string }>();

  return <SeerahScreen initialAge={parseSeerahAge(age)} initialPlace={place ?? null} initialView={parseSeerahView(view)} />;
}
