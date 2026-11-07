import { useLocalSearchParams } from 'expo-router';

import { parseHadithId } from '@/features/hadith/routes';
import { HadithChapterScreen } from '@/features/hadith/screens/HadithChapterScreen';

export default function HadithChapterRoute() {
  const { collection, book, chapter } = useLocalSearchParams<{ collection: string; book: string; chapter: string }>();

  return (
    <HadithChapterScreen
      bookId={parseHadithId(typeof book === 'string' ? book : undefined)}
      chapterId={parseHadithId(typeof chapter === 'string' ? chapter : undefined)}
      slug={typeof collection === 'string' ? collection : ''}
    />
  );
}
