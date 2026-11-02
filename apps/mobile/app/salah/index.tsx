import { goBackOr, MENU_TAB } from '@/core/navigation/go-back';
import { SalahScreen } from '@/features/salah/screens/SalahScreen';

/** The الصلاة screen pushed from the Menu (`/salah`). Back returns to the Menu; the tab itself has no back. */
export default function SalahRoute() {
  return <SalahScreen onBack={() => goBackOr(MENU_TAB)} />;
}
