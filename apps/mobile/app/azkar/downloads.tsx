import { azkarDownloadPort } from '@/features/azkar/audio/port';
import { AzkarDownloadsScreen } from '@/features/azkar/screens/AzkarDownloadsScreen';

/** Saved audio (`/azkar/downloads`). Pushed over the tabs. */
export default function AzkarDownloadsRoute() {
  return <AzkarDownloadsScreen port={azkarDownloadPort} />;
}
