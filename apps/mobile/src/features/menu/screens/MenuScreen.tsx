import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { useAzkarAvailable } from '@/features/azkar/data';
import { azkarHref } from '@/features/azkar/routes';
import { useMiniPlayerVisible } from '@/features/audio/hooks/useMiniPlayerVisible';
import { ScreenHeader, Screen, type IconName } from '@/shared/ui';

import { MenuAzkarCard } from '../components/MenuAzkarCard';
import { MenuCard } from '../components/MenuCard';
import { MenuGrid } from '../components/MenuGrid';
import { MenuSearchButton } from '../components/MenuSearchButton';
import { menuSearchBottom } from '../data/search-position';
import { useMenuPreviews } from '../hooks/useMenuPreviews';

const ICON = {
  salah: { ios: 'moon.stars', android: 'mosque' },
  qibla: { ios: 'safari', android: 'explore' },
  khatma: { ios: 'checkmark.circle', android: 'check_circle' },
  mushaf: { ios: 'book', android: 'menu_book' },
  listen: { ios: 'headphones', android: 'headphones' },
  myQuran: { ios: 'bookmark', android: 'bookmark' },
  search: { ios: 'magnifyingglass', android: 'search' },
  settings: { ios: 'slider.horizontal.3', android: 'tune' },
  sources: { ios: 'info.circle', android: 'info' },
} as const satisfies Record<string, IconName>;

/**
 * The القائمة tab (quran-app-screens.html, #Menu; ADR 0032): a two-column staggered grid of cards, each opening a
 * section, and the floating search button. The Azkar card mounts only once Azkar content is installed (ADR 0031 §10),
 * and a preview line only when it has data. Composition only: the cards and their previews are feature components
 * and hooks.
 */
export function MenuScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const miniShown = useMiniPlayerVisible('tabs');
  const previews = useMenuPreviews();
  // Read here (not in the card) so that without Azkar content the card, and its database read, never mount.
  const azkarAvailable = useAzkarAvailable();

  // The floating search button sits above the tab bar. The list keeps clear of it, and of the button's own row.
  const searchBottom = menuSearchBottom(Platform.OS, insets.bottom, miniShown);

  return (
    <Screen testID="screen-menu">
      <ContentColumn gutter={theme.space[5]}>
        <ScrollView
          contentContainerStyle={{
            gap: theme.space[4],
            paddingBottom: searchBottom + theme.size.touchTarget + theme.space[4],
          }}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          testID="menu-scroll"
        >
          <ScreenHeader testID="menu-title" title={t('menu.title')} />
          <MenuGrid>
            <MenuCard
              caption={t('menu.salah.caption')}
              icon={ICON.salah}
              key="salah"
              onPress={() => router.navigate('/(main)/(salah)')}
              preview={previews.prayerPreview}
              testID="menu-card-salah"
              title={previews.prayerTitle}
            />
            {azkarAvailable ? <MenuAzkarCard key="azkar" onPress={() => router.push(azkarHref.home)} /> : null}
            <MenuCard
              caption={t('menu.qibla.caption')}
              icon={ICON.qibla}
              key="qibla"
              onPress={() => router.push('/salah/qibla' as Href)}
              preview={previews.qiblaPreview}
              testID="menu-card-qibla"
              title={t('menu.qibla.title')}
            />
            <MenuCard
              caption={t('menu.khatma.caption')}
              icon={ICON.khatma}
              key="khatma"
              onPress={() => router.push('/khatma' as Href)}
              preview={previews.khatmaPreview ?? undefined}
              testID="menu-card-khatma"
              title={t('menu.khatma.title')}
            />
            <MenuCard
              caption={t('menu.mushaf.caption')}
              icon={ICON.mushaf}
              key="mushaf"
              onPress={() => router.navigate('/(main)/(mushaf)')}
              preview={t('menu.mushaf.subtitle')}
              testID="menu-card-mushaf"
              title={t('menu.mushaf.title')}
            />
            <MenuCard
              caption={t('menu.listen.caption')}
              icon={ICON.listen}
              key="listen"
              onPress={() => router.navigate('/(main)/(listen)')}
              preview={t('menu.listen.subtitle')}
              testID="menu-card-listen"
              title={t('menu.listen.title')}
            />
            <MenuCard
              caption={t('menu.myQuran.caption')}
              icon={ICON.myQuran}
              key="my-quran"
              onPress={() => router.navigate('/(main)/(my-quran)')}
              preview={t('menu.myQuran.subtitle')}
              testID="menu-card-my-quran"
              title={t('menu.myQuran.title')}
            />
            <MenuCard
              caption={t('menu.search.caption')}
              icon={ICON.search}
              key="search"
              onPress={() => router.push('/search')}
              testID="menu-card-search"
              title={t('menu.search.title')}
            />
            <MenuCard
              caption={t('menu.settings.caption')}
              icon={ICON.settings}
              key="settings"
              onPress={() => router.push('/settings')}
              preview={t('menu.settings.subtitle')}
              testID="menu-card-settings"
              title={t('menu.settings.title')}
            />
            <MenuCard
              caption={t('menu.sources.caption')}
              icon={ICON.sources}
              key="sources"
              onPress={() => router.push('/settings/sources')}
              preview={t('menu.sources.subtitle')}
              testID="menu-card-sources"
              title={t('menu.sources.title')}
            />
          </MenuGrid>
        </ScrollView>
      </ContentColumn>
      <MenuSearchButton bottom={searchBottom} onPress={() => router.push('/search')} />
    </Screen>
  );
}
