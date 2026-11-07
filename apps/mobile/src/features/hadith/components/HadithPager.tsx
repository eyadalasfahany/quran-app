import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatNumber } from '@/core/i18n';
import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { IconButton, UiText } from '@/shared/ui';

import { formatHadithNumber } from '../format';

const PREVIOUS = { ios: 'chevron.left', android: 'chevron_left' } as const;
const NEXT = { ios: 'chevron.right', android: 'chevron_right' } as const;
const POSITION_MIN_WIDTH = 96;

/** Previous, position and next. Previous comes first in the tree, so Arabic puts it on the right. */
export function HadithPager({
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  position,
  total,
  testID = 'hadith-pager',
}: {
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  /** The hadith number being read, as text. */
  position: string;
  /** The collection's hadith count, or null to show the number alone. */
  total: number | null;
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const current = formatHadithNumber(position, locale);
  const text = total === null ? current : t('hadith.pager.position', { current, total: formatNumber(total, locale) });

  return (
    <View
      style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[4], justifyContent: 'center' }}
      testID={testID}
    >
      <IconButton
        disabled={!hasPrevious}
        icon={PREVIOUS}
        label={t('hadith.pager.previous')}
        mirrorInRtl
        onPress={onPrevious}
        testID={`${testID}-previous`}
        variant="raised"
      />
      <UiText
        accessibilityRole="text"
        align="center"
        style={{ minWidth: POSITION_MIN_WIDTH }}
        testID={`${testID}-position`}
        tone="muted"
        variant="caption"
      >
        {text}
      </UiText>
      <IconButton
        disabled={!hasNext}
        icon={NEXT}
        label={t('hadith.pager.next')}
        mirrorInRtl
        onPress={onNext}
        testID={`${testID}-next`}
        variant="raised"
      />
    </View>
  );
}
