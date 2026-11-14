import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { BackButton, GlassSurface, Icon, IconButton, TitlePill, UiText } from '@/shared/ui';

import { ListToggle, type SeerahView } from './ListToggle';

const INFO_ICON = { ios: 'info.circle', android: 'info' } as const;
const CHEVRON = { ios: 'chevron.right', android: 'chevron_right' } as const;

/**
 * The transparent header over the map (frames SeerahMapRegion, SeerahMapMakkah): back, the title pill with the level's
 * subtitle, the map key and the list toggle. On a city map `levelChip` replaces back with the «المنطقة» chip that returns to
 * the region (a pinch out does the same). Everything is a 44 pt target on glass.
 */
export function MapHeader({
  title,
  subtitle,
  onBack,
  levelChip,
  onOpenKey,
  view = 'map',
  onToggleView,
  testID = 'seerah-map-header',
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  /** Present on a city map: the label of the region and what it does. */
  levelChip?: { label: string; onPress: () => void };
  onOpenKey: () => void;
  view?: SeerahView;
  onToggleView: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[2] }} testID={testID}>
      {levelChip === undefined ? (
        <BackButton onPress={onBack} testID={`${testID}-back`} />
      ) : (
        <Pressable
          accessibilityLabel={t('seerah.map.levelRegionLabel')}
          accessibilityRole="button"
          onPress={levelChip.onPress}
          testID={`${testID}-level`}
        >
          <GlassSurface
            radius="pill"
            style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[1], minHeight: theme.size.touchTarget, paddingHorizontal: theme.space[4] }}
          >
            <UiText scale="bar" tone="brand" variant="headline">
              {levelChip.label}
            </UiText>
            <Icon color={theme.colors.brand} mirrorInRtl name={CHEVRON} size={theme.size.iconSm} />
          </GlassSurface>
        </Pressable>
      )}
      <View style={{ flex: 1 }}>
        <GlassSurface radius="pill" style={{ justifyContent: 'center', minHeight: theme.size.touchTarget }}>
          <TitlePill subtitle={subtitle} title={title} />
        </GlassSurface>
      </View>
      <IconButton icon={INFO_ICON} label={t('seerah.map.key')} onPress={onOpenKey} testID={`${testID}-key`} variant="raised" />
      <ListToggle onToggle={onToggleView} testID={`${testID}-toggle`} view={view} />
    </View>
  );
}
