import { useLocalSearchParams } from 'expo-router';

import { parseHadithId } from '@/features/hadith/routes';
import { HadithBookScreen } from '@/features/hadith/screens/HadithBookScreen';
import { HadithRunScreen } from '@/features/hadith/screens/HadithRunScreen';

/**
 * The book route. With `from` and `to` (entry positions of a run, ADR 0076 option B) it opens that run's hadith; without
 * them it opens the book.
 */
export default function HadithBookRoute() {
  const { collection, book, from, to } = useLocalSearchParams<{ collection: string; book: string; from?: string; to?: string }>();
  const slug = typeof collection === 'string' ? collection : '';
  const bookId = parseHadithId(typeof book === 'string' ? book : undefined);
  const first = parseHadithId(typeof from === 'string' ? from : undefined);
  const last = parseHadithId(typeof to === 'string' ? to : undefined);

  if (first !== null && last !== null) {
    return <HadithRunScreen bookId={bookId} from={first} slug={slug} to={last} />;
  }
  return <HadithBookScreen bookId={bookId} slug={slug} />;
}
