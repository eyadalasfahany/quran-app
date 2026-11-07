import { router } from 'expo-router';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';

import { hadithHref } from '../routes';

import { HadithListHeader } from './HadithListHeader';
import { HadithStateView } from './HadithStateView';

/**
 * What a browse screen shows before its content is known: the loading skeleton, or the not-found state for a
 * collection, book, chapter or hadith that is not in the device's packs. Always keeps a back button.
 */
export function HadithBrowseFallback({
  kind,
  onBack,
  testID = 'hadith-browse-fallback',
}: {
  kind: 'loading' | 'notFound';
  onBack: () => void;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View style={{ flex: 1, gap: theme.space[4] }} testID={testID}>
      <HadithListHeader onBack={onBack} />
      <HadithStateView kind={kind} onAction={() => router.replace(hadithHref.home)} testID={`${testID}-state`} />
    </View>
  );
}
