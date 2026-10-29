import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { IconButton, ScreenHeader } from '@/shared/ui';

import { joinStatusLine } from '../reciter-list';

const BACK_ICON = { ios: 'chevron.left', android: 'chevron_left' } as const;

// The reciter's page header (no frame; built from the Downloads frame's back button and the large title of the
// screens). The back button sits above the large title, which shows the reciter's name. The muted line under
// it is the style and the count of downloaded surahs.
export function ReciterPageHeader({
  name,
  styleLabel,
  downloaded,
  total,
  onBack,
  testID = 'reciter-page-header',
}: {
  name: string;
  /** The recitation style, already translated, or null when the reciter has none. */
  styleLabel: string | null;
  downloaded: number;
  total: number;
  onBack: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const count = t('listen.reciter.countOf', { n: formatNumber(downloaded, locale), total: formatNumber(total, locale) });

  return (
    <View style={{ gap: theme.space[3] }} testID={testID}>
      <View style={{ flexDirection: 'row' }}>
        <IconButton
          icon={BACK_ICON}
          label={t('listen.reciter.back')}
          mirrorInRtl
          onPress={onBack}
          testID="reciter-back"
          variant="raised"
        />
      </View>
      <ScreenHeader hint={joinStatusLine([styleLabel, count]) ?? undefined} title={name} />
    </View>
  );
}
