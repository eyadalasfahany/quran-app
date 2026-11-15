import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { IconButton, UiText } from '@/shared/ui';

import { ClearChip } from './ClearChip';
import type { TimelineOrientation } from './timeline-axis';

const PREV_H = { ios: 'chevron.left', android: 'chevron_left' } as const;
const NEXT_H = { ios: 'chevron.right', android: 'chevron_right' } as const;
const PREV_V = { ios: 'chevron.up', android: 'keyboard_arrow_up' } as const;
const NEXT_V = { ios: 'chevron.down', android: 'keyboard_arrow_down' } as const;

/**
 * The timeline's title row: what is selected («كل الأعمار» or «عمره ٥٥ سنة») with its detail line, the «الكل» chip that
 * clears the selection, and the step arrows (one age back and forward). 44 pt targets.
 */
export function TimelineHeader({
  title,
  subtitle,
  orientation = 'horizontal',
  showClear,
  onClear,
  onPrevious,
  onNext,
  testID,
}: {
  title: string;
  subtitle: string;
  orientation?: TimelineOrientation;
  /** True when an age (or «غير محدد») is selected. */
  showClear: boolean;
  onClear: () => void;
  onPrevious: () => void;
  onNext: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const horizontal = orientation === 'horizontal';

  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[1], minHeight: theme.size.touchTarget }} testID={testID}>
      {/* Frame SeerahMapRegion: the title at 16 over a one-line 12 pt detail, 6 pt in from the start. */}
      <View style={{ flex: 1, minWidth: 0, paddingStart: 6 }}>
        <UiText accessibilityRole="header" numberOfLines={1} scale="bar" style={horizontal ? { fontSize: 16, lineHeight: 21 } : null} variant="headline">
          {title}
        </UiText>
        <UiText numberOfLines={horizontal ? 1 : 2} scale="bar" tone="muted" variant="label" weight={400}>
          {subtitle}
        </UiText>
      </View>
      {showClear ? (
        <ClearChip label={t('seerah.timeline.all')} hint={t('seerah.timeline.allHint')} onPress={onClear} testID={testID ? `${testID}-clear` : undefined} />
      ) : null}
      <IconButton
        icon={horizontal ? PREV_H : PREV_V}
        iconSize={theme.size.iconMd}
        label={t('seerah.timeline.previous')}
        mirrorInRtl={horizontal}
        onPress={onPrevious}
        testID={testID ? `${testID}-previous` : undefined}
      />
      <IconButton
        icon={horizontal ? NEXT_H : NEXT_V}
        iconSize={theme.size.iconMd}
        label={t('seerah.timeline.next')}
        mirrorInRtl={horizontal}
        onPress={onNext}
        testID={testID ? `${testID}-next` : undefined}
      />
    </View>
  );
}
