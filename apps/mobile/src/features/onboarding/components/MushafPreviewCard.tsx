import { useState } from 'react';
import { Image, type ImageSourcePropType, View } from 'react-native';

import type { MushafKey } from '@/features/reader/mushafs';
import { Card, useContrastColors } from '@/shared/ui';

/** The artwork's ratio: 1074 by 571 pixels. */
const PREVIEW_ASPECT_RATIO = 1074 / 571;

/** On a wide or short window the picture stops growing taller than this; it scales narrower and stays centred. */
const PREVIEW_MAX_HEIGHT = 220;

// Static requires, so the bundler ships every riwayah's picture (scripts/generate-onboarding-previews.py).
const PREVIEWS: Record<MushafKey, ImageSourcePropType> = {
  hafs: require('../../../../assets/mushaf/onboarding-preview-hafs.png'),
  warsh: require('../../../../assets/mushaf/onboarding-preview-warsh.png'),
  qalun: require('../../../../assets/mushaf/onboarding-preview-qalun.png'),
  shubah: require('../../../../assets/mushaf/onboarding-preview-shubah.png'),
  duri: require('../../../../assets/mushaf/onboarding-preview-duri.png'),
};

/** A decorative picture of one riwayah's first page of Al Imran, so it is hidden from screen readers. Its ink follows light and dark mode. */
export function MushafPreviewCard({
  mushaf,
  testID = 'onboarding-mushaf-preview',
}: {
  mushaf: MushafKey;
  testID?: string;
}) {
  const colors = useContrastColors();
  const [available, setAvailable] = useState(0);

  // Sized from the measured inner width, so the picture never crops a word: the height follows the ratio, capped.
  const height = Math.min(available / PREVIEW_ASPECT_RATIO, PREVIEW_MAX_HEIGHT);
  const width = height * PREVIEW_ASPECT_RATIO;

  return (
    <Card padding={1} testID={testID} tone="page">
      <View
        onLayout={(event) => setAvailable(event.nativeEvent.layout.width)}
        style={{ alignItems: 'center' }}
        testID={`${testID}-frame`}
      >
        <Image
          accessible={false}
          resizeMode="contain"
          source={PREVIEWS[mushaf]}
          style={{ height, width }}
          testID={`${testID}-image`}
          tintColor={colors.ink}
        />
      </View>
    </Card>
  );
}
