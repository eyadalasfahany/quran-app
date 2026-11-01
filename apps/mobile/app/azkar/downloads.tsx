import { AzkarDownloadsScreen } from '@/features/azkar/screens/AzkarDownloadsScreen';

/** Saved audio (`/azkar/downloads`). Pushed over the tabs; the port reports nothing until a licensed recording exists. */
export default function AzkarDownloadsRoute() {
  return <AzkarDownloadsScreen />;
}
