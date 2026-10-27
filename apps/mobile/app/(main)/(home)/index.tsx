import { useTranslation } from 'react-i18next';

import { SectionScreen } from '@/core/layout';

export default function HomeScreen() {
  const { t } = useTranslation();
  return <SectionScreen testID="screen-home" title={t('tabs.home')} />;
}
