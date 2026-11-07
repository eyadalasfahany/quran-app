import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { ContentColumn, useTabBarScrollHandlers, useTabContentBottom, useWidthClass } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { azkarHref } from '@/features/azkar/routes';
import { MenuDuasCard } from '@/features/duas/components/MenuDuasCard';
import { MenuHadithCard } from '@/features/hadith/components/MenuHadithCard';
import { useHadithHomeEntry } from '@/features/hadith/availability';
import { hadithHref } from '@/features/hadith/routes';
import { useDuasAvailable } from '@/features/duas/data/hooks';
import { duasHref } from '@/features/duas/routes';
// import { MenuNamesCard } from '@/features/names/components/MenuNamesCard';
// import { useNamesAvailable } from '@/features/names/data/hooks';
// import { namesHref } from '@/features/names/routes';
import { MenuHijriCard } from '@/features/hijri/components/MenuHijriCard';
import { MenuMoonCard } from '@/features/moon/components/MenuMoonCard';
import { useMoonMenuPreview } from '@/features/moon/hooks/useMoonMenuPreview';
import { isHijriCalendarAvailable } from '@/features/hijri/data/hijri-date';
import { useHijriDate } from '@/features/hijri/hooks/useHijriDate';
import { Screen, ScreenHeader, SearchButton, type IconName } from '@/shared/ui';

import { MenuCard } from '../components/MenuCard';
import { MenuGrid } from '../components/MenuGrid';
import { MenuSalahCard } from '../components/MenuSalahCard';
import { useAzkarMenuPreview } from '../hooks/useAzkarMenuPreview';
import { useMenuPreviews } from '../hooks/useMenuPreviews';

const ICON = {
  continueReading: { ios: 'book.pages', android: 'auto_stories' },
  azkar: { ios: 'circle.dotted', android: 'scatter_plot' },
  favorites: { ios: 'star', android: 'star' },
  salah: { ios: 'moon.stars', android: 'mosque' },
  qibla: { ios: 'safari', android: 'explore' },
  khatma: { ios: 'checkmark.circle', android: 'check_circle' },
  mushaf: { ios: 'book', android: 'menu_book' },
  discover: { ios: 'sparkles', android: 'auto_awesome' },
  listen: { ios: 'headphones', android: 'headphones' },
  myQuran: { ios: 'bookmark', android: 'bookmark' },
  search: { ios: 'magnifyingglass', android: 'search' },
  settings: { ios: 'slider.horizontal.3', android: 'tune' },
  sources: { ios: 'info.circle', android: 'info' },
  reminders: { ios: 'bell', android: 'notifications' },
} as const satisfies Record<string, IconName>;

/**
 * The القائمة tab (screens/, #Menu; ADR 0032 §3 and decision 6): a two-column staggered grid of cards,
 * each opening a section, and the search button in the header row beside the title (as Home). The continue cards come
 * first and show only when there is something to continue. Azkar cards show only once Azkar content is installed (ADR 0031 §10). Composition only: the
 * cards and their previews come from hooks.
 */
export function MenuScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const tabScroll = useTabBarScrollHandlers();
  // The list ends clear of the tab bar and the mini player, as Home's does (`useTabContentBottom`).
  const bottom = useTabContentBottom();
  const previews = useMenuPreviews();
  const azkar = useAzkarMenuPreview();
  const duasAvailable = useDuasAvailable();
  const hadithEntry = useHadithHomeEntry();
  // const namesAvailable = useNamesAvailable();
  const hijriDate = useHijriDate();
  const hijriAvailable = isHijriCalendarAvailable();
  const moonPreview = useMoonMenuPreview();
  // Three columns where the window is wide, a landscape phone included (ADR 0036); two on a phone in portrait.
  const columns = useWidthClass() === 'compact' ? 2 : 3;

  // A card that is not shown is null: MenuGrid drops it, so the two columns still alternate over the cards shown.
  const reading = previews.continueReading;
  const resume = azkar.resume;

  const cards = [
    reading ? (
      <MenuCard
        caption={t('menu.continueReading.caption')}
        icon={ICON.continueReading}
        key="continue-reading"
        onPress={() => router.push(reading.href)}
        preview={reading.preview}
        testID="menu-card-continue-reading"
        title={reading.title}
      />
    ) : null,
    resume ? (
      <MenuCard
        caption={resume.caption}
        icon={ICON.azkar}
        key="continue-azkar"
        onPress={() => router.push(resume.href)}
        preview={resume.preview}
        progress={resume.progress}
        testID="menu-card-continue-azkar"
        title={resume.title}
      />
    ) : null,
    <MenuSalahCard
      caption={t('menu.salah.caption')}
      icon={ICON.salah}
      key="salah"
      onPress={() => router.push('/salah' as Href)}
    />,
    // The Hijri calendar card (ADR 0048): shown where the platform computes the calendar.
    hijriAvailable ? <MenuHijriCard key="hijri" onPress={() => router.push('/hijri' as Href)} preview={hijriDate} /> : null,
    <MenuMoonCard key="moon" onPress={() => router.push('/moon' as Href)} preview={moonPreview} />,
    azkar.available ? (
      <MenuCard
        caption={t('menu.azkar.caption')}
        icon={ICON.azkar}
        key="azkar"
        onPress={() => router.push(azkarHref.home)}
        preview={t('menu.azkar.subtitle')}
        testID="menu-card-azkar"
        title={t('menu.azkar.title')}
      />
    ) : null,
    azkar.available ? (
      <MenuCard
        caption={t('menu.favorites.caption')}
        icon={ICON.favorites}
        key="azkar-favorites"
        onPress={() => router.push(azkarHref.favorites)}
        preview={t('menu.favorites.subtitle')}
        testID="menu-card-azkar-favorites"
        title={t('menu.favorites.title')}
      />
    ) : null,
    duasAvailable ? <MenuDuasCard key="duas" onPress={() => router.push(duasHref.home)} /> : null,
    hadithEntry.menuCard ? <MenuHadithCard key="hadith" onPress={() => router.push(hadithHref.home)} /> : null,
    // namesAvailable ? <MenuNamesCard key="names" onPress={() => router.push(namesHref.home)} /> : null,
    <MenuCard
      caption={t('menu.discover.caption')}
      icon={ICON.discover}
      key="discover"
      onPress={() => router.push('/discover' as Href)}
      preview={t('menu.discover.subtitle')}
      testID="menu-card-discover"
      title={t('menu.discover.title')}
    />,
    <MenuCard
      caption={t('menu.reminders.caption')}
      icon={ICON.reminders}
      key="reminders"
      onPress={() => router.push('/reminders' as Href)}
      preview={t('menu.reminders.subtitle')}
      testID="menu-card-reminders"
      title={t('menu.reminders.title')}
    />,
    <MenuCard
      caption={t('menu.qibla.caption')}
      icon={ICON.qibla}
      key="qibla"
      onPress={() => router.push('/salah/qibla' as Href)}
      preview={previews.qiblaPreview}
      testID="menu-card-qibla"
      title={t('menu.qibla.title')}
    />,
    <MenuCard
      caption={t('menu.khatma.caption')}
      icon={ICON.khatma}
      key="khatma"
      onPress={() => router.push('/khatma' as Href)}
      preview={previews.khatmaPreview ?? undefined}
      testID="menu-card-khatma"
      title={t('menu.khatma.title')}
    />,
    <MenuCard
      caption={t('menu.mushaf.caption')}
      icon={ICON.mushaf}
      key="mushaf"
      onPress={() => router.navigate('/(main)/(mushaf)')}
      preview={t('menu.mushaf.subtitle')}
      testID="menu-card-mushaf"
      title={t('menu.mushaf.title')}
    />,
    <MenuCard
      caption={t('menu.listen.caption')}
      icon={ICON.listen}
      key="listen"
      onPress={() => router.navigate('/(main)/(listen)')}
      preview={t('menu.listen.subtitle')}
      testID="menu-card-listen"
      title={t('menu.listen.title')}
    />,
    <MenuCard
      caption={t('menu.myQuran.caption')}
      icon={ICON.myQuran}
      key="my-quran"
      onPress={() => router.navigate('/(main)/(my-quran)')}
      preview={t('menu.myQuran.subtitle')}
      testID="menu-card-my-quran"
      title={t('menu.myQuran.title')}
    />,
    <MenuCard
      caption={azkar.available ? t('menu.search.captionQuranAndAzkar') : t('menu.search.captionQuran')}
      icon={ICON.search}
      key="search"
      onPress={() => router.push('/search')}
      testID="menu-card-search"
      title={t('menu.search.title')}
    />,
    <MenuCard
      caption={t('menu.settings.caption')}
      icon={ICON.settings}
      key="settings"
      onPress={() => router.push('/settings')}
      preview={t('menu.settings.subtitle')}
      testID="menu-card-settings"
      title={t('menu.settings.title')}
    />,
    <MenuCard
      caption={t('menu.sources.caption')}
      icon={ICON.sources}
      key="sources"
      onPress={() => router.push('/settings/sources')}
      preview={t('menu.sources.subtitle')}
      testID="menu-card-sources"
      title={t('menu.sources.title')}
    />,
  ];

  return (
    <Screen testID="screen-menu">
      <ContentColumn gutter={theme.space[5]}>
        <ScrollView
          contentContainerStyle={{
            gap: theme.space[4],
            paddingBottom: bottom + theme.space[4],
          }}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          testID="menu-scroll"
          {...tabScroll}
        >
          <ScreenHeader
            testID="menu-title"
            title={t('menu.title')}
            trailing={<SearchButton onPress={() => router.push('/search')} testID="menu-search" />}
          />
          <MenuGrid columns={columns}>{cards}</MenuGrid>
        </ScrollView>
      </ContentColumn>
    </Screen>
  );
}
