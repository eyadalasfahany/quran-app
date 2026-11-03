import { duration } from '@quran/design-tokens';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useLocale } from '@/core/i18n';
import { formatNumber } from '@/core/i18n/numbers';
import { easeOut } from '@/core/theme/motion';
import { useTheme } from '@/core/theme';
import { Button, UiText, useContrastColors } from '@/shared/ui';

import { useDiscoverState } from '../hooks/useDiscover';
import { DISCOVER_ENTRIES, tourKeyFor, type DiscoverId } from '../registry';
import { completeTourStep, endTour, skipTourStep } from '../store';
import { DiscoverTipCloseButton } from './DiscoverTipCloseButton';
import { DiscoverTipTextButton } from './DiscoverTipTextButton';

/** The pointer's side, in points (a square turned 45°, half of it under the card). */
const TIP_POINTER = 12;

/**
 * The guided tour's tip for one step (ADR 0053, amended 3 Nov 2026; quran-app-screens.html, #DiscoverTip). It shows
 * only while the tour is on `id`: the step's line, «الخطوة ٣ من ١٣», and ✕ to end the tour. A show step offers
 * «التالي» (done, next step) and «تخطي» (done as seen, next step); an action step offers «تخطي» only, because doing the
 * action is what completes it. `pointer` draws the arrow under the card, for a tip placed right above its control. It
 * fades in (also under Reduce Motion, since a fade is calm) and is announced as it appears.
 */
export function DiscoverTipCard({ id, pointer = false, testID }: { id: DiscoverId; pointer?: boolean; testID?: string }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const colors = useContrastColors();
  const { tourStep } = useDiscoverState();
  const index = DISCOVER_ENTRIES.findIndex((entry) => entry.id === id);
  const entry = DISCOVER_ENTRIES[index];

  if (tourStep !== id || entry === undefined) {
    return null;
  }

  return (
    <Animated.View entering={FadeIn.duration(duration.standard).easing(easeOut)} testID={testID ?? `discover-tip-${id}`}>
      <View
        accessibilityLiveRegion="polite"
        style={{
          backgroundColor: theme.colors.brand,
          borderRadius: theme.radius.lg,
          gap: theme.space[2],
          marginBottom: pointer ? theme.space[2] : 0,
          paddingBottom: theme.space[4],
          paddingStart: theme.space[5],
          paddingEnd: theme.space[2],
          paddingTop: theme.space[2],
        }}
      >
        <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
          <UiText style={{ color: colors.onBrand }} tone="onBrand" variant="caption">
            {t('discover.tour.stepOf', {
              current: formatNumber(index + 1, locale),
              total: formatNumber(DISCOVER_ENTRIES.length, locale),
            })}
          </UiText>
          <DiscoverTipCloseButton label={t('discover.tour.end')} onPress={endTour} testID="discover-tip-end" />
        </View>
        <View style={{ gap: theme.space[3], paddingEnd: theme.space[3] }}>
          <UiText accessibilityRole="text" style={{ color: colors.onBrand }} tone="onBrand" variant="subhead" weight={500}>
            {t(tourKeyFor(entry))}
          </UiText>
          <View style={{ alignItems: 'center', alignSelf: 'flex-end', flexDirection: 'row', gap: theme.space[2] }}>
            <DiscoverTipTextButton label={t('discover.tour.skip')} onPress={skipTourStep} testID="discover-tip-skip" />
            {entry.step === 'show' ? (
              <Button label={t('discover.tour.next')} onPress={completeTourStep} size="small" testID="discover-tip-next" variant="secondary" />
            ) : null}
          </View>
        </View>
        {pointer ? (
          // The arrow under the card, aimed at the control the tip names.
          <View
            importantForAccessibility="no"
            style={{
              alignSelf: 'center',
              backgroundColor: theme.colors.brand,
              bottom: -TIP_POINTER / 2,
              height: TIP_POINTER,
              position: 'absolute',
              transform: [{ rotate: '45deg' }],
              width: TIP_POINTER,
            }}
            testID="discover-tip-pointer"
          />
        ) : null}
      </View>
    </Animated.View>
  );
}
