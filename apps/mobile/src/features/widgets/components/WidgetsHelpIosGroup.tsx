import { useTranslation } from 'react-i18next';

import { SettingsGroup } from '@/features/settings/components/SettingsGroup';

import { WidgetsHelpSteps } from './WidgetsHelpSteps';

/** iPhone: add widgets from the Home Screen (text steps only on device). */
export function WidgetsHelpIosGroup({ testID = 'widgets-help-ios' }: { testID?: string }) {
  const { t } = useTranslation();

  return (
    <SettingsGroup testID={testID} title={t('widgetsHelp.sections.ios')}>
      <WidgetsHelpSteps namespace="widgetsHelp.ios" testID={`${testID}-steps`} />
    </SettingsGroup>
  );
}
