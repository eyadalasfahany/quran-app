import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { IconButton } from '@/shared/ui';

const PREVIOUS = { ios: 'chevron.left', android: 'chevron_left' } as const;
const NEXT = { ios: 'chevron.right', android: 'chevron_right' } as const;

/**
 * The bottom row: previous and next arrows at the edges, and the count (or done) control in the middle. The arrows
 * mirror with the layout direction, so «previous» is on the right in Arabic.
 */
export function AzkarReaderControls({
  canPrevious,
  canNext,
  onPrevious,
  onNext,
  children,
  testID = 'azkar-reader-controls',
}: {
  canPrevious: boolean;
  canNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  children: ReactNode;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[3], paddingHorizontal: theme.space[4] }} testID={testID}>
      <IconButton
        disabled={!canPrevious}
        icon={PREVIOUS}
        label={t('azkar.reader.previous')}
        mirrorInRtl
        onPress={onPrevious}
        testID="azkar-reader-previous"
        variant="surface"
      />
      <View style={{ alignItems: 'center', flex: 1 }}>{children}</View>
      <IconButton
        disabled={!canNext}
        icon={NEXT}
        label={t('azkar.reader.next')}
        mirrorInRtl
        onPress={onNext}
        testID="azkar-reader-next"
        variant="surface"
      />
    </View>
  );
}
