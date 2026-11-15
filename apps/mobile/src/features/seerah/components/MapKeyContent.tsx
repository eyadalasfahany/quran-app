import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Svg from 'react-native-svg';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { SheetScrollView } from '@/features/reader/components/SheetScrollView';
import { Card, SheetHeader, UiText } from '@/shared/ui';

import { LIFE_STAGES } from '../logic';
import type { SeerahRouteKind } from '../types';

import { ClusterPin } from './ClusterPin';
import { EdgeChip } from './EdgeChip';
import { MapKeyRow } from './MapKeyRow';
import { MapPin } from './MapPin';
import { RouteLine } from './RouteLine';
import { useSeerahSheetClose, useSheetBottomPadding } from './SeerahSheet';

const noop = () => undefined;
const ROUTES: SeerahRouteKind[] = ['hijra', 'taif', 'trip', 'habasha', 'ghazwa'];
const SAMPLE_PATH = 'M6,24 C26,24 44,8 76,8';

/**
 * The content of the map key sheet (frame SeerahMapKey): what each pin, ring and edge means, what each route line is, and the
 * life-stage colours of the timeline with its milestone marks. Every symbol is the real component, drawn untouchable. The
 * sheet's modal and detents belong to the screen.
 */
export function MapKeyContent({ onClose, testID = 'seerah-map-key' }: { onClose: () => void; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const close = useSeerahSheetClose(onClose);
  const bottom = useSheetBottomPadding();
  const caption = (key: 'places' | 'routes' | 'timeline') => (
    <UiText accessibilityRole="header" tone="muted" variant="caption" weight={600}>
      {t(`seerah.key.${key}`)}
    </UiText>
  );
  const stageColor = {
    adolescence: theme.colors.highlightGreen,
    childhood: theme.colors.highlightGold,
    maturity: theme.colors.highlightRose,
    youth: theme.colors.highlightBlue,
  } as const;

  return (
    <View style={{ flex: 1, gap: theme.space[3] }} testID={testID}>
      <View style={{ paddingHorizontal: theme.space[4] }}>
        <SheetHeader closeLabel={t('seerah.close')} displaySize={24} onClose={close} size="display" title={t('seerah.map.key')} />
      </View>
      <SheetScrollView contentContainerStyle={{ gap: theme.space[2], paddingBottom: bottom, paddingHorizontal: theme.space[4] }} testID={`${testID}-scroll`}>
        {caption('places')}
        <Card padding={1} radius="lg">
          <MapKeyRow hint={t('seerah.key.cityHint')} symbol={<ClusterPin count={56} label="" onPress={noop} variant="city" />} testID={`${testID}-city`} title={t('seerah.key.city')} />
          <MapKeyRow hint={t('seerah.key.clusterHint')} symbol={<ClusterPin count={7} label="" onPress={noop} />} testID={`${testID}-cluster`} title={t('seerah.key.cluster')} />
          <MapKeyRow hint={t('seerah.key.singleHint')} symbol={<MapPin label="" onPress={noop} />} testID={`${testID}-single`} title={t('seerah.key.single')} />
          <MapKeyRow hint={t('seerah.key.approximateHint')} symbol={<MapPin label="" onPress={noop} uncertain />} testID={`${testID}-approximate`} title={t('seerah.key.approximate')} />
          <MapKeyRow hint={t('seerah.key.emptyHint')} symbol={<MapPin label="" onPress={noop} variant="empty" />} testID={`${testID}-empty`} title={t('seerah.key.empty')} />
          <MapKeyRow hint={t('seerah.key.otherHint')} symbol={<EdgeChip accessibilityLabel="" count={0} direction="other" label="" onPress={noop} symbol />} testID={`${testID}-other`} title={t('seerah.key.other')} />
          <MapKeyRow hint={t('seerah.key.edgeHint')} symbol={<EdgeChip accessibilityLabel="" count={0} direction="north" label="" onPress={noop} symbol />} testID={`${testID}-edge`} title={t('seerah.key.edge')} />
        </Card>
        {caption('routes')}
        <Card padding={1} radius="lg">
          {ROUTES.map((kind) => (
            <MapKeyRow
              hint={t(`seerah.key.route.${kind}.hint`)}
              key={kind}
              symbol={
                <Svg height={32} width={84}>
                  <RouteLine d={SAMPLE_PATH} kind={kind} />
                </Svg>
              }
              testID={`${testID}-route-${kind}`}
              title={t(`seerah.key.route.${kind}.title`)}
            />
          ))}
        </Card>
        {caption('timeline')}
        <Card padding={4} radius="lg">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[3] }}>
            {LIFE_STAGES.map((stage) => (
              <View key={stage.key} style={{ flexBasis: '45%', flexGrow: 1, gap: theme.space[1] }} testID={`${testID}-stage-${stage.key}`}>
                <View style={{ alignItems: 'baseline', flexDirection: 'row', gap: theme.space[2] }}>
                  <UiText variant="subhead" weight={600}>
                    {t(`seerah.stages.${stage.key}`)}
                  </UiText>
                  <UiText tone="muted" variant="label" weight={400}>
                    {t('seerah.stageRangeShort', { from: formatNumber(stage.from, locale), to: formatNumber(stage.to, locale) })}
                  </UiText>
                </View>
                <View style={{ backgroundColor: stageColor[stage.key], borderRadius: 3, height: 6 }} />
              </View>
            ))}
          </View>
          <UiText style={{ marginTop: theme.space[3] }} tone="muted" variant="caption">
            {t('seerah.key.milestonesNote')}
          </UiText>
        </Card>
      </SheetScrollView>
    </View>
  );
}
