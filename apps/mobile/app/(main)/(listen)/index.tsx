import { useTranslation } from 'react-i18next';

import { SectionScreen } from '@/core/layout';

export default function ListenScreen() {
  const { t } = useTranslation();
  return <SectionScreen testID="screen-listen" title={t('tabs.listen')} />;
}
