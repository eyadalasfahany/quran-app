import { View } from 'react-native';

import { SkeletonBlock } from '@/shared/ui';

// Seven lines of a tafsir passage, the last one short, as in the Tafsir loading frame.
const LINE_WIDTHS = ['100%', '96%', '98%', '91%', '100%', '94%', '62%'] as const;
const LINE_HEIGHT = 10;
const LINE_GAP = 12;

// Placeholder for a tafsir passage that is still downloading. Compose it inside a SkeletonGroup.
export function TafsirTextSkeleton({ testID }: { testID?: string }) {
  return (
    <View style={{ gap: LINE_GAP }} testID={testID}>
      {LINE_WIDTHS.map((width, index) => (
        <SkeletonBlock height={LINE_HEIGHT} key={index} testID={testID ? `${testID}-line-${index}` : undefined} width={width} />
      ))}
    </View>
  );
}
