import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from '@/shared/ui';

export function NamePager({
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  testID = 'name-pager',
}: {
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  testID?: string;
}) {
  const { t } = useTranslation();

  return (
    <View style={{ flexDirection: 'row', gap: 12 }} testID={testID}>
      <View style={{ flex: 1 }}>
        <Button disabled={!hasPrevious} label={t('names.detail.previous')} onPress={onPrevious} testID={`${testID}-previous`} variant="secondary" />
      </View>
      <View style={{ flex: 1 }}>
        <Button disabled={!hasNext} label={t('names.detail.next')} onPress={onNext} testID={`${testID}-next`} variant="primary" />
      </View>
    </View>
  );
}
