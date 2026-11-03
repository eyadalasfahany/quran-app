import { useMarkDiscoveredOnFocus } from '@/features/discover/hooks/useDiscover';
import { MyQuranScreen } from '@/features/my-quran/screens/MyQuranScreen';

export default function MyQuran() {
  // Opened, not mounted: the tabs keep screens mounted (ADR 0053 §2).
  useMarkDiscoveredOnFocus('my-quran');
  return <MyQuranScreen />;
}
