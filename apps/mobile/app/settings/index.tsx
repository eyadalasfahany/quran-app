import { useMarkDiscoveredOnFocus } from '@/features/discover/hooks/useDiscover';
import { SettingsScreen } from '@/features/settings/screens/SettingsScreen';

export default function SettingsRoute() {
  // Opened, not mounted: the tabs and stacks keep screens mounted (ADR 0053 §2).
  useMarkDiscoveredOnFocus('app.settings');
  return <SettingsScreen />;
}
