import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { Icon, UiText } from '@/shared/ui';

const BOOK = { ios: 'book.closed', android: 'menu_book' } as const;

/** «المصدر: «نور اليقين في سيرة سيد المرسلين»، محمد الخضري بك · ص ١٢٣ · نسخة OpenITI»: the credit under every event's text. */
export function SourceLine({ page, testID = 'seerah-source-line' }: { page: number | null; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();

  return (
    <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: theme.space[2] }} testID={testID}>
      <View style={{ marginTop: 1 }}>
        <Icon color={theme.colors.inkMuted} name={BOOK} size={16} />
      </View>
      <UiText style={{ flex: 1 }} tone="muted" variant="caption">
        {page === null ? t('seerah.event.sourceNoPage') : t('seerah.event.source', { page: formatNumber(page, locale) })}
      </UiText>
    </View>
  );
}
