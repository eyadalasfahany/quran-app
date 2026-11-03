import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

export function DownloadsFooterNote({ testID }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <UiText
      style={{ lineHeight: 18, marginHorizontal: theme.space[1] + 2 }}
      testID={testID}
      tone="muted"
      variant="label"
      weight={400}
    >
      {t('downloads.screen.footerNote')}
    </UiText>
  );
}
