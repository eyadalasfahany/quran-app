import { useLocalSearchParams } from 'expo-router';

import { parseSeerahAge, parseSeerahView } from '@/features/seerah/routes';
import { SeerahScreen } from '@/features/seerah/screens/SeerahScreen';

export default function SeerahRoute() {
  const { view, age, place } = useLocalSearchParams<{ view?: string; age?: string; place?: string }>();

  // The screen reads its parameters once, on mount. A new set from `router.navigate` (the event page's chips) must open a
  // fresh screen, so the key follows the parameters; the same parameters keep the map's state.
  return (
    <SeerahScreen
      initialAge={parseSeerahAge(age)}
      initialPlace={place ?? null}
      initialView={parseSeerahView(view)}
      key={`${view ?? ''}|${age ?? ''}|${place ?? ''}`}
    />
  );
}
