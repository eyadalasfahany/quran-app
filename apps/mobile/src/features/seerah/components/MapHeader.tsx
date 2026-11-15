import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { BackButton, GlassSurface, Icon, IconButton, UiText } from '@/shared/ui';

import { ListToggle, type SeerahView } from './ListToggle';

const INFO_ICON = { ios: 'info.circle', android: 'info' } as const;
// The level chip goes back up to the region: a back chevron at its start (frame SeerahMapMadinah), mirrored in RTL.
const CHEVRON = { ios: 'chevron.left', android: 'chevron_left' } as const;

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
        colorScheme={theme.name === 'dark' ? 'dark' : 'light'}
            radius="pill"
            style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[1], minHeight: theme.size.touchTarget, paddingHorizontal: theme.space[4] }}
          >
            <Icon color={theme.colors.brand} mirrorInRtl name={CHEVRON} size={theme.size.iconSm} testID={`${testID}-level-chevron`} />
            <UiText scale="bar" tone="brand" variant="headline">
              {levelChip.label}
            </UiText>
          </GlassSurface>
        </Pressable>
      )}
      <View style={{ flex: 1 }}>
        {/* Frame SeerahMapRegion: a 44 pt pill, the title in Amiri 18 over a 12 pt subtitle, 2 pt above and below. */}
        <GlassSurface
        colorScheme={theme.name === 'dark' ? 'dark' : 'light'} radius="pill" style={{ justifyContent: 'center', minHeight: theme.size.touchTarget, paddingHorizontal: theme.space[3], paddingVertical: 2 }}>
          <View accessibilityLabel={`${title}, ${subtitle}`} accessibilityRole="header" accessible style={{ alignItems: 'center' }} testID={`${testID}-title`}>
            <UiText numberOfLines={1} scale="bar" style={{ fontSize: 18, lineHeight: 22 }} variant="displaySm">
              {title}
            </UiText>
            <UiText numberOfLines={1} scale="bar" style={{ fontSize: 12, lineHeight: 15 }} tone="muted" variant="label" weight={400}>
              {subtitle}
            </UiText>
          </View>
        </GlassSurface>
      </View>
      <IconButton icon={INFO_ICON} label={t('seerah.map.key')} onPress={onOpenKey} testID={`${testID}-key`} variant="raised" />
      <ListToggle onToggle={onToggleView} testID={`${testID}-toggle`} view={view} />
    </View>
  );
}
