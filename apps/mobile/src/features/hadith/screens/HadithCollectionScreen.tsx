import { useWindowClass } from '@/core/layout';

import { HadithExpandedBrowser } from '../components/HadithExpandedBrowser';

import { HadithCollectionPhoneScreen } from './HadithCollectionPhoneScreen';

/** One collection. Expanded windows show the two-pane browser; other windows the phone screen. */
export function HadithCollectionScreen({ slug, testID = 'screen-hadith-collection' }: { slug: string; testID?: string }) {
  const windowClass = useWindowClass();
  if (windowClass === 'expanded') {
    return <HadithExpandedBrowser initialBookId={null} initialNumber={null} slug={slug} testID={`${testID}-expanded`} />;
  }
  return <HadithCollectionPhoneScreen slug={slug} testID={testID} />;
}
