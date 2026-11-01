const apply = require('D:/projects/quran-app/scratch-edit.js');

apply('src/features/audio/screens/ListenScreen.tsx', [
  ["import { useOnline } from '@/core/network/useOnline';\n", ''],
  ["import { EmptyState, OfflineBanner, Screen, SkeletonGroup } from '@/shared/ui';", "import { EmptyState, Screen, SkeletonGroup } from '@/shared/ui';"],
  ['  const online = useOnline();\n', ''],
  [`        {/* The frame's notice floats over the top of the list (quran-app-screens.html, Offline). */}
        <View
          pointerEvents="box-none"
          style={{ left: FRAME_GUTTER, position: 'absolute', right: FRAME_GUTTER, top: theme.space[2], zIndex: 1 }}
        >
          <OfflineBanner visible={!online} />
        </View>
`, ''],
]);

apply('src/features/audio/screens/ReciterDownloadsScreen.tsx', [
  ["import { ConfirmDialog, EmptyState, OfflineBanner, Screen, SkeletonGroup } from '@/shared/ui';", "import { ConfirmDialog, EmptyState, Screen, SkeletonGroup } from '@/shared/ui';"],
  [`        {/* The frame's notice floats over the top of the list (quran-app-screens.html, Offline). */}
        <View
          pointerEvents="box-none"
          style={{ left: FRAME_GUTTER, position: 'absolute', right: FRAME_GUTTER, top: theme.space[2], zIndex: 1 }}
        >
          <OfflineBanner visible={!online} />
        </View>
`, ''],
  [`        message={t('listen.reciter.deleteBody')}`, `        icon={DELETE_ICON}
        message={t('listen.reciter.deleteBody')}`],
]);

apply('src/features/azkar/screens/AzkarDownloadsScreen.tsx', [
  [`        destructive
        message={t('azkar.downloads.removeAllBody')}`, `        destructive
        icon={REMOVE_ALL_ICON}
        message={t('azkar.downloads.removeAllBody')}`],
]);

apply('src/features/azkar/components/AzkarReminderRow.tsx', [
  [`          confirmLabel={t('common.openSettings')}
          message={t('settings.reminders.permissionDeniedBody')}`, `          confirmLabel={t('common.openSettings')}
          icon={PERMISSION_DENIED_ICON}
          message={t('settings.reminders.permissionDeniedBody')}`],
]);

apply('src/features/home/screens/HomeScreen.tsx', [
  ["import { SearchButton, SkeletonGroup, type IconName } from '@/shared/ui';", "import { SearchButton, SkeletonGroup, StaleContentBanner, type IconName } from '@/shared/ui';"],
  ["import { useAzkarMenuPreview } from '@/features/menu/hooks/useAzkarMenuPreview';", "import { useAzkarMenuPreview } from '@/features/menu/hooks/useAzkarMenuPreview';\nimport { useStaleContent } from '@/core/sync/useStaleContent';"],
  ["  const progress = useDailyProgress();", "  const progress = useDailyProgress();\n  // The quiet notice that the content has not been checked for over seven days (spec §7, hop 3, item 6).\n  const stale = useStaleContent();"],
  [`        {!ready ? (
          <SkeletonGroup testID="home-continue-loading">`, `        <StaleContentBanner visible={stale} />
        {!ready ? (
          <SkeletonGroup testID="home-continue-loading">`],
]);
