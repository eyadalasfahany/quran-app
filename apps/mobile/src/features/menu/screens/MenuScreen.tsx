import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { ContentColumn, useTabBarScrollHandlers, useTabContentBottom, useWidthClass } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { azkarHref } from '@/features/azkar/routes';
import { MenuDuasCard } from '@/features/duas/components/MenuDuasCard';
import { MenuHadithCard } from '@/features/hadith/components/MenuHadithCard';
import { useHadithHomeEntry } from '@/features/hadith/availability';
import { hadithHref } from '@/features/hadith/routes';
import { SeerahMenuCard } from '@/features/seerah/components/SeerahMenuCard';
import { useSeerahMenuCard } from '@/features/seerah/availability';
import { seerahHref } from '@/features/seerah/routes';
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
import { useSibhaTodayTotal } from '@/features/sibha/data/store';
import { Screen, ScreenHeader, SearchButton, type IconName } from '@/shared/ui';

import { MenuCard } from '../components/MenuCard';
import { MenuSalahCard } from '../components/MenuSalahCard';
import { MenuSection } from '../components/MenuSection';
import { useAzkarMenuPreview } from '../hooks/useAzkarMenuPreview';
import { useMenuPreviews } from '../hooks/useMenuPreviews';

const ICON = {
  continueReading: { ios: 'book.pages', android: 'auto_stories' },
  azkar: { ios: 'circle.dotted', android: 'scatter_plot' },
  favorites: { ios: 'star', android: 'star' },
  salah: { ios: 'moon.stars', android: 'mosque' },
  sibha: { ios: 'circle.circle', android: 'adjust' },
  qibla: { ios: 'safari', android: 'explore' },
  khatma: { ios: 'checkmark.circle', android: 'check_circle' },
  mushaf: { ios: 'book', android: 'menu_book' },
  discover: { ios: 'sparkles', android: 'auto_awesome' },
  listen: { ios: 'headphones', android: 'headphones' },
  myQuran: { ios: 'bookmark', android: 'bookmark' },
  settings: { ios: 'slider.horizontal.3', android: 'tune' },
  sources: { ios: 'info.circle', android: 'info' },
  reminders: { ios: 'bell', android: 'notifications' },
} as const satisfies Record<string, IconName>;

/**
 * The القائمة tab (screens/frames/menu, #MenuSections; ADR 0032, ADR 0099): the search button in the header row, the
 * next-prayer hero, then titled colour sections in daily-use order (ADR 0089), each an even grid of cards. The continue
 * section shows only when there is something to continue. Azkar cards show only once Azkar content is installed
 * (ADR 0031 §10). Composition only: the cards and their previews come from hooks.
 */
export function MenuScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const tabScroll = useTabBarScrollHandlers();
  // The list ends clear of the tab bar and the mini player, as Home's does (`useTabContentBottom`).
  const bottom = useTabContentBottom();
  const previews = useMenuPreviews();
  const azkar = useAzkarMenuPreview();
  const duasAvailable = useDuasAvailable();
  const hadithEntry = useHadithHomeEntry();
  const seerahCard = useSeerahMenuCard();
  // const namesAvailable = useNamesAvailable();
  const hijriDate = useHijriDate();
  const hijriAvailable = isHijriCalendarAvailable();
  const moonPreview = useMoonMenuPreview();
  // Three columns where the window is wide, a landscape phone included (ADR 0036); two on a phone in portrait.
  const columns = useWidthClass() === 'compact' ? 2 : 3;

  const reading = previews.continueReading;
  const resume = azkar.resume;
  const sibhaToday = useSibhaTodayTotal();

  return (
    <Screen testID="screen-menu">
      <ContentColumn gutter={theme.space[5]}>
        <ScrollView
          contentContainerStyle={{
            gap: theme.space[6],
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
          <MenuSalahCard caption={t('menu.salah.caption')} icon={ICON.salah} onPress={() => router.push('/salah' as Href)} />
          {/* A card that is not shown is null: the section drops it, and a section left empty is not drawn. */}
          <MenuSection columns={columns} testID="menu-section-continue" title={t('menu.sections.continue')}>
            {reading ? (
              <MenuCard
                caption={t('menu.continueReading.caption')}
                icon={ICON.continueReading}
                onPress={() => router.push(reading.href)}
                preview={reading.preview}
                testID="menu-card-continue-reading"
                title={reading.title}
                tone="green"
              />
            ) : null}
            {resume ? (
              <MenuCard
                caption={resume.caption}
                icon={ICON.azkar}
                onPress={() => router.push(resume.href)}
                preview={resume.preview}
                progress={resume.progress}
                testID="menu-card-continue-azkar"
                title={resume.title}
                tone="gold"
              />
            ) : null}
          </MenuSection>
          <MenuSection columns={columns} testID="menu-section-worship" title={t('menu.sections.worship')} tone="gold">
            {azkar.available ? (
              <MenuCard
                caption={t('menu.azkar.caption')}
                icon={ICON.azkar}
                onPress={() => router.push(azkarHref.home)}
                preview={t('menu.azkar.subtitle')}
                testID="menu-card-azkar"
                title={t('menu.azkar.title')}
              />
            ) : null}
            <MenuCard
              caption={t('menu.qibla.caption')}
              icon={ICON.qibla}
              onPress={() => router.push('/salah/qibla' as Href)}
              preview={previews.qiblaPreview}
              testID="menu-card-qibla"
              title={t('menu.qibla.title')}
            />
            <MenuCard
              caption={t('menu.sibha.caption')}
              icon={ICON.sibha}
              onPress={() => router.push('/sibha' as Href)}
              preview={t('menu.sibha.today', { count: formatNumber(sibhaToday, locale) })}
              testID="menu-card-sibha"
              title={t('menu.sibha.title')}
            />
            {duasAvailable ? <MenuDuasCard onPress={() => router.push(duasHref.home)} /> : null}
            {azkar.available ? (
              <MenuCard
                caption={t('menu.favorites.caption')}
                icon={ICON.favorites}
                onPress={() => router.push(azkarHref.favorites)}
                preview={t('menu.favorites.subtitle')}
                testID="menu-card-azkar-favorites"
                title={t('menu.favorites.title')}
              />
            ) : null}
            <MenuCard
              caption={t('menu.reminders.caption')}
              icon={ICON.reminders}
              onPress={() => router.push('/reminders' as Href)}
              preview={t('menu.reminders.subtitle')}
              testID="menu-card-reminders"
              title={t('menu.reminders.title')}
            />
          </MenuSection>
          <MenuSection columns={columns} testID="menu-section-quran" title={t('menu.sections.quran')} tone="green">
            <MenuCard
              caption={t('menu.mushaf.caption')}
              icon={ICON.mushaf}
              onPress={() => router.navigate('/(main)/(mushaf)')}
              preview={t('menu.mushaf.subtitle')}
              testID="menu-card-mushaf"
              title={t('menu.mushaf.title')}
            />
            <MenuCard
              caption={t('menu.khatma.caption')}
              icon={ICON.khatma}
              onPress={() => router.push('/khatma' as Href)}
              preview={previews.khatmaPreview ?? undefined}
              testID="menu-card-khatma"
              title={t('menu.khatma.title')}
            />
            <MenuCard
              caption={t('menu.listen.caption')}
              icon={ICON.listen}
              onPress={() => router.navigate('/(main)/(listen)')}
              preview={t('menu.listen.subtitle')}
              testID="menu-card-listen"
              title={t('menu.listen.title')}
            />
            <MenuCard
              caption={t('menu.myQuran.caption')}
              icon={ICON.myQuran}
              onPress={() => router.navigate('/(main)/(my-quran)')}
              preview={t('menu.myQuran.subtitle')}
              testID="menu-card-my-quran"
              title={t('menu.myQuran.title')}
            />
          </MenuSection>
          <MenuSection columns={columns} testID="menu-section-learn" title={t('menu.sections.learn')} tone="blue">
            {hadithEntry.menuCard ? <MenuHadithCard onPress={() => router.push(hadithHref.home)} /> : null}
            {seerahCard ? <SeerahMenuCard onPress={() => router.push(seerahHref.home)} /> : null}
            {/* namesAvailable ? <MenuNamesCard onPress={() => router.push(namesHref.home)} /> : null */}
            <MenuCard
              caption={t('menu.discover.caption')}
              icon={ICON.discover}
              onPress={() => router.push('/discover' as Href)}
              preview={t('menu.discover.subtitle')}
              testID="menu-card-discover"
              title={t('menu.discover.title')}
            />
          </MenuSection>
          <MenuSection columns={columns} testID="menu-section-calendar" title={t('menu.sections.calendar')} tone="rose">
            {/* The Hijri calendar card (ADR 0048): shown where the platform computes the calendar. */}
            {hijriAvailable ? <MenuHijriCard onPress={() => router.push('/hijri' as Href)} preview={hijriDate} /> : null}
            <MenuMoonCard onPress={() => router.push('/moon' as Href)} preview={moonPreview} />
          </MenuSection>
          <MenuSection columns={columns} testID="menu-section-app" title={t('menu.sections.app')} tone="neutral">
            <MenuCard
              caption={t('menu.settings.caption')}
              icon={ICON.settings}
              onPress={() => router.push('/settings')}
              preview={t('menu.settings.subtitle')}
              testID="menu-card-settings"
              title={t('menu.settings.title')}
            />
            <MenuCard
              caption={t('menu.sources.caption')}
              icon={ICON.sources}
              onPress={() => router.push('/settings/sources')}
              preview={t('menu.sources.subtitle')}
              testID="menu-card-sources"
              title={t('menu.sources.title')}
            />
          </MenuSection>
        </ScrollView>
      </ContentColumn>
    </Screen>
  );
}
