import { View } from 'react-native';

import { SkeletonBlock } from '@/shared/ui';

const LINE_COUNT = 15;
const LINE_HEIGHT = 14;
const LINE_GAP = 18;
const LAST_LINE_WIDTH = '58%';

// Placeholder for a Mushaf page whose font is still loading: fifteen Mushaf lines, the last one short and centred.
// It never draws Quran text in another font. Compose it inside a SkeletonGroup, in the page's own min height.
export function MushafPageSkeleton({ testID }: { testID?: string }) {
  return (
    <View style={{ alignSelf: 'stretch', gap: LINE_GAP, paddingHorizontal: 4, paddingVertical: 12 }} testID={testID}>
      {Array.from({ length: LINE_COUNT }, (_, index) => {
        const last = index === LINE_COUNT - 1;
        return (
          <SkeletonBlock
            height={LINE_HEIGHT}
            key={index}
            style={last ? { alignSelf: 'center' } : undefined}
            testID={testID ? `${testID}-line-${index}` : undefined}
            width={last ? LAST_LINE_WIDTH : '100%'}
          />
        );
      })}
    </View>
  );
}
