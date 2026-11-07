import { useLocalSearchParams } from 'expo-router';

import { HadithReaderScreen } from '@/features/hadith/screens/HadithReaderScreen';

export default function HadithReaderRoute() {
  // The number is text, as stored ('3.1'). Expo Router decodes the segment; it is never parsed to a number.
  const { collection, number } = useLocalSearchParams<{ collection: string; number: string }>();

  return (
    <HadithReaderScreen
      hadithNumber={typeof number === 'string' ? number : ''}
      slug={typeof collection === 'string' ? collection : ''}
    />
  );
}
