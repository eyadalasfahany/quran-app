import { useTranslation } from 'react-i18next';

import { SectionScreen } from '@/core/layout';

export default function MushafScreen() {
  const { t } = useTranslation();
  return <SectionScreen testID="screen-mushaf" title={t('tabs.mushaf')} />;
}
