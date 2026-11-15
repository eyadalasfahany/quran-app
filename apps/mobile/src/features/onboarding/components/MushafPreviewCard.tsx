import { Image } from 'react-native';

import { Card, useContrastColors } from '@/shared/ui';

/** The artwork's ratio: 1074 by 571 pixels. */
const PREVIEW_ASPECT_RATIO = 1074 / 571;

/** A decorative picture of a Hafs page, so it is hidden from screen readers. Its ink follows light and dark mode. */
export function MushafPreviewCard({ testID = 'onboarding-mushaf-preview' }: { testID?: string }) {
  const colors = useContrastColors();

  return (
    <Card padding={1} testID={testID} tone="page">
      <Image
        accessible={false}
        resizeMode="contain"
        source={require('../../../../assets/mushaf/onboarding-preview-hafs.png')}
        style={{ aspectRatio: PREVIEW_ASPECT_RATIO, width: '100%' }}
        testID={`${testID}-image`}
        tintColor={colors.ink}
      />
    </Card>
  );
}
