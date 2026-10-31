import { useAzkarMenuPreview } from '../hooks/useAzkarMenuPreview';

import { MenuCard } from './MenuCard';

const AZKAR_ICON = { ios: 'circle.dotted', android: 'scatter_plot' } as const;

/**
 * The menu's Azkar card (ADR 0031 §10): «تابع» with the scope in progress, its count and a bar, or the subtitle. Mount
 * it only when Azkar content is installed; the menu decides that, so an unavailable Azkar leaves no card and no slot.
 */
export function MenuAzkarCard({ onPress, testID = 'menu-card-azkar' }: { onPress: () => void; testID?: string }) {
  const preview = useAzkarMenuPreview();

  return (
    <MenuCard
      caption={preview.caption}
      icon={AZKAR_ICON}
      onPress={onPress}
      preview={preview.preview}
      progress={preview.progress}
      testID={testID}
      title={preview.title}
    />
  );
}
