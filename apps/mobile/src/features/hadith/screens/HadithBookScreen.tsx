import { useWindowClass } from '@/core/layout';

import { HadithExpandedBrowser } from '../components/HadithExpandedBrowser';

import { HadithBookPhoneScreen } from './HadithBookPhoneScreen';

/** One book. Expanded windows show the two-pane browser on this book; other windows the phone screen. */
export function HadithBookScreen({
  slug,
  bookId,
  testID = 'screen-hadith-book',
}: {
  slug: string;
  bookId: number | null;
  testID?: string;
}) {
  const windowClass = useWindowClass();
  if (windowClass === 'expanded' && bookId !== null) {
    return <HadithExpandedBrowser initialBookId={bookId} initialNumber={null} slug={slug} testID={`${testID}-expanded`} />;
  }
  return <HadithBookPhoneScreen bookId={bookId} slug={slug} testID={testID} />;
}
