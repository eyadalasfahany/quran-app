import { useWindowClass } from '@/core/layout';

import { HadithExpandedBrowser } from '../components/HadithExpandedBrowser';

import { HadithReaderPhoneScreen } from './HadithReaderPhoneScreen';

/**
 * One hadith. An expanded window (1194 pt wide in landscape on a tablet) shows the two-pane browser with the reader in
 * the end pane and the details panel beside it; every other window shows the phone reader (`useWindowClass`, never a device).
 */
export function HadithReaderScreen({
  slug,
  hadithNumber,
  testID = 'screen-hadith-reader',
}: {
  slug: string;
  hadithNumber: string;
  testID?: string;
}) {
  const windowClass = useWindowClass();
  if (windowClass === 'expanded') {
    return <HadithExpandedBrowser initialBookId={null} initialNumber={hadithNumber} slug={slug} testID={`${testID}-expanded`} />;
  }
  return <HadithReaderPhoneScreen hadithNumber={hadithNumber} slug={slug} testID={testID} />;
}
