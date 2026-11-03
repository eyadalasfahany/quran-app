import { useCallback, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getWidgetInfo, requestPinWidget } from 'react-native-android-widget';

import { useTheme } from '@/core/theme';
import { Button, UiText } from '@/shared/ui';

import type { WidgetAddCatalogId } from '../data/widget-add-catalog';
import { widgetAddCatalogEntry } from '../data/widget-add-catalog';
import {
  effectiveAddDestination,
  markWidgetPinCompleted,
  readWidgetAddDestination,
  saveWidgetAddDestination,
  type WidgetAddDestination,
} from '../data/add-prefs';
import { WidgetAddConfirmDialog, type WidgetAddConfirmMode } from './WidgetAddConfirmDialog';
import { WidgetsHelpSteps } from './WidgetsHelpSteps';

/**
 * Opens the add confirm dialog and runs the platform add path (ADR 0054).
 */
export function WidgetAddTrigger({
  catalogId,
  testID,
}: {
  catalogId: WidgetAddCatalogId;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const entry = widgetAddCatalogEntry(catalogId);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMode, setDialogMode] = useState<WidgetAddConfirmMode>('add');
  const [destination, setDestination] = useState<WidgetAddDestination>(() =>
    effectiveAddDestination(entry.destinations, readWidgetAddDestination()),
  );
  const [addStepsVisible, setAddStepsVisible] = useState(false);
  const [addStepsDestination, setAddStepsDestination] = useState<WidgetAddDestination>('home');
  const [pinSupported, setPinSupported] = useState(true);

  const resolveDestination = useCallback(
    (raw: WidgetAddDestination) => effectiveAddDestination(entry.destinations, raw),
    [entry.destinations],
  );

  const openAddDialog = useCallback(() => {
    setDialogMode('add');
    setDestination(resolveDestination(readWidgetAddDestination()));
    setDialogVisible(true);
  }, [resolveDestination]);

  const closeDialog = useCallback(() => {
    setDialogVisible(false);
  }, []);

  const openAddSteps = useCallback(
    (effective: WidgetAddDestination) => {
      setAddStepsDestination(effective);
      closeDialog();
      setAddStepsVisible(true);
    },
    [closeDialog],
  );

  const runAndroidPin = useCallback(async () => {
    try {
      const ok = await requestPinWidget({ widgetName: entry.provider });
      if (!ok) {
        setPinSupported(false);
        return;
      }
      markWidgetPinCompleted(entry.provider);
    } catch {
      setPinSupported(false);
    }
  }, [entry.provider]);

  const continueAdd = useCallback(async () => {
    const effective = resolveDestination(destination);
    saveWidgetAddDestination(effective);

    if (effective === 'lock') {
      openAddSteps('lock');
      return;
    }

    if (Platform.OS === 'ios') {
      openAddSteps('home');
      return;
    }

    try {
      const existing = await getWidgetInfo(entry.provider);
      if (existing.length > 0) {
        setDialogMode('already');
        return;
      }
    } catch {
      // Best-effort only; proceed to pin when the check fails.
    }

    closeDialog();
    await runAndroidPin();
  }, [closeDialog, destination, entry.provider, openAddSteps, resolveDestination, runAndroidPin]);

  const onConfirm = useCallback(() => {
    if (dialogMode === 'already') {
      closeDialog();
      void runAndroidPin();
      return;
    }
    void continueAdd();
  }, [closeDialog, continueAdd, dialogMode, runAndroidPin]);

  const onCancel = useCallback(() => {
    closeDialog();
  }, [closeDialog]);

  const iosKindName = useMemo(() => {
    const kind =
      addStepsDestination === 'lock' && entry.iosKind.lock !== undefined
        ? entry.iosKind.lock
        : entry.iosKind.home;
    return kind;
  }, [addStepsDestination, entry.iosKind]);

  const addStepsNamespace = useMemo((): 'widgetsHelp.androidLock' | 'widgetsHelp.ios' => {
    if (Platform.OS === 'android' && addStepsDestination === 'lock') {
      return 'widgetsHelp.androidLock';
    }
    return 'widgetsHelp.ios';
  }, [addStepsDestination]);

  const addStepsHintKey = useMemo(() => {
    if (Platform.OS === 'android') {
      return 'widgetsHelp.addConfirm.androidLockHint';
    }
    return addStepsDestination === 'lock'
      ? 'widgetsHelp.addConfirm.iosLockHint'
      : 'widgetsHelp.addConfirm.iosHomeHint';
  }, [addStepsDestination]);

  if (Platform.OS === 'android' && !pinSupported) {
    return null;
  }

  const actionLabel =
    Platform.OS === 'android' ? t('widgetsHelp.android.pinAction') : t('widgetsHelp.addConfirm.continue');

  return (
    <>
      <Button
        accessibilityHint={t('widgetsHelp.android.pinA11y', { widget: entry.provider })}
        label={actionLabel}
        onPress={openAddDialog}
        size="small"
        testID={testID}
        variant="primary"
      />
      <WidgetAddConfirmDialog
        destination={destination}
        entry={entry}
        mode={dialogMode}
        onCancel={onCancel}
        onConfirm={onConfirm}
        onDestinationChange={setDestination}
        testID={testID ? `${testID}-dialog` : undefined}
        visible={dialogVisible}
      />
      <Modal
        animationType="fade"
        onRequestClose={() => setAddStepsVisible(false)}
        transparent
        visible={addStepsVisible}
      >
        <Pressable
          onPress={() => setAddStepsVisible(false)}
          style={{ backgroundColor: theme.colors.scrim, flex: 1, justifyContent: 'center', padding: theme.space[6] }}
          testID={testID ? `${testID}-add-steps-scrim` : undefined}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{
              backgroundColor: theme.colors.surfaceRaised,
              borderRadius: theme.radius.xl,
              maxHeight: '80%',
              padding: theme.space[5],
            }}
            testID={testID ? `${testID}-add-steps-card` : undefined}
          >
            <ScrollView>
              <UiText style={{ marginBottom: theme.space[3] }} variant="title" weight={600}>
                {t(`widgetsHelp.items.${catalogId}.title`)}
              </UiText>
              <UiText style={{ marginBottom: theme.space[2] }} tone="muted" variant="body">
                {t(addStepsHintKey, Platform.OS === 'ios' ? { kind: iosKindName } : undefined)}
              </UiText>
              {Platform.OS === 'ios' ? (
                <UiText style={{ marginBottom: theme.space[3] }} variant="body" weight={600}>
                  {iosKindName}
                </UiText>
              ) : null}
              <WidgetsHelpSteps
                namespace={addStepsNamespace}
                testID={testID ? `${testID}-add-steps` : undefined}
              />
            </ScrollView>
            <Button
              label={t('widgetsHelp.addConfirm.done')}
              onPress={() => setAddStepsVisible(false)}
              testID={testID ? `${testID}-add-steps-done` : undefined}
              variant="primary"
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
