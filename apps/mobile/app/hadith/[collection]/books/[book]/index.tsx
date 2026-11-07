import { useLocalSearchParams } from 'expo-router';

import { parseHadithId } from '@/features/hadith/routes';
import { HadithBookScreen } from '@/features/hadith/screens/HadithBookScreen';

export default function HadithBookRoute() {
  const { collection, book } = useLocalSearchParams<{ collection: string; book: string }>();

  return (
    <HadithBookScreen
      bookId={parseHadithId(typeof book === 'string' ? book : undefined)}
      slug={typeof collection === 'string' ? collection : ''}
    />
  );
}
