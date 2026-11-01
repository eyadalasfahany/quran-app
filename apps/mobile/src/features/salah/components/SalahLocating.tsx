import { useTheme } from '@/core/theme';
import { SkeletonBlock, SkeletonGroup } from '@/shared/ui';

// Placeholder heights for the hero and the times card (shaped like NextPrayerHero and the six rows of PrayerTimesCard).
const HERO_HEIGHT = 176;
const ROW_HEIGHT = 56;
const ROWS = 6;

/**
 * The loading state of the الصلاة screen while the location is being read. It holds the hero and the times card's place,
 * so the no-location empty state is never shown during a read. It is one busy region labelled «جارٍ التحميل».
 */
export function SalahLocating({ testID = 'salah-locating' }: { testID?: string }) {
  const theme = useTheme();

  return (
    <SkeletonGroup style={{ gap: theme.size.sectionGap }} testID={testID}>
      <SkeletonBlock height={HERO_HEIGHT} radius={theme.radius.hero} width="100%" />
      {Array.from({ length: ROWS }, (_, index) => (
        <SkeletonBlock height={ROW_HEIGHT} key={index} width="100%" />
      ))}
    </SkeletonGroup>
  );
}
