import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/theme';
import { Button } from '@/shared/ui';

// The results list footer: a full-width ghost button with the list's vertical rhythm.
export function SearchShowMore({ onPress, testID = 'search-show-more' }: { onPress: () => void; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Button
      label={t('search.showMore')}
      onPress={onPress}
      stretch
      style={{ paddingVertical: theme.space[4] }}
      testID={testID}
      variant="ghost"
    />
  );
}
