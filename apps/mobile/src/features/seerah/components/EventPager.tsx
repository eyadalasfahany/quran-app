import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { GlassSurface, Icon, UiText, arabicTextDirection } from '@/shared/ui';

const PREV = { ios: 'chevron.left', android: 'chevron_left' } as const;
const NEXT = { ios: 'chevron.right', android: 'chevron_right' } as const;

export type PagerTarget = { id: string; title: string };

/**
 * Previous and next event in book order (frame SeerahEvent): a floating glass bar with the neighbours' headings and the
 * place in the book («٧٨ من ١٦٢»). A missing neighbour (the first or last event) leaves its slot empty and disabled.
 */
export function EventPager({
  previous,
  next,
  index,
  total,
  onPrevious,
  onNext,
  testID = 'seerah-event-pager',
}: {
  previous: PagerTarget | null;
  next: PagerTarget | null;
  index: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();

  const slot = (target: PagerTarget | null, direction: 'previous' | 'next') => {
    const label = t(`seerah.event.pager.${direction}`);
    return (
      <Pressable
        accessibilityLabel={target === null ? label : t(`seerah.event.pager.${direction}Label`, { title: target.title })}
        accessibilityRole="button"
        accessibilityState={{ disabled: target === null }}
        disabled={target === null}
        onPress={direction === 'previous' ? onPrevious : onNext}
        style={{
          alignItems: 'center',
          flex: 1,
          flexDirection: direction === 'previous' ? 'row' : 'row-reverse',
          gap: theme.space[2],
          minHeight: theme.size.controlHeight + 4,
          opacity: target === null ? theme.opacity.disabled : 1,
          paddingHorizontal: theme.space[3],
        }}
        testID={`${testID}-${direction}`}
      >
        <Icon color={theme.colors.brand} mirrorInRtl name={direction === 'previous' ? PREV : NEXT} size={theme.size.iconMd} />
        <View style={{ flex: 1 }}>
          <UiText scale="bar" tone="muted" variant="label" weight={400}>
            {label}
          </UiText>
          {target === null ? null : (
            <UiText numberOfLines={1} scale="bar" style={arabicTextDirection} variant="subhead" weight={600}>
              {target.title}
            </UiText>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <GlassSurface interactive radius="xl" style={{ alignItems: 'center', flexDirection: 'row', padding: theme.space[1] }} testID={testID}>
      {slot(previous, 'previous')}
      <UiText scale="bar" tone="muted" variant="label" weight={400}>
        {t('seerah.event.pager.position', { index: formatNumber(index, locale), total: formatNumber(total, locale) })}
      </UiText>
      {slot(next, 'next')}
    </GlassSurface>
  );
}
