import { fireEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { locales, renderUi } from '../../../../jest/render-ui';

import { widgetAddCatalogEntry } from '../data/widget-add-catalog';
import { WidgetAddConfirmDialog } from './WidgetAddConfirmDialog';

const entry = widgetAddCatalogEntry('nextPrayer');

describe('WidgetAddConfirmDialog', () => {
  it.each(locales)('renders add copy and preview in %s', async (locale) => {
    Platform.OS = 'ios';
    const view = await renderUi(
      <WidgetAddConfirmDialog
        destination="home"
        entry={entry}
        mode="add"
        onCancel={() => undefined}
        onConfirm={() => undefined}
        onDestinationChange={() => undefined}
        testID="add-confirm"
        visible
      />,
      { locale },
    );
    expect(view.getByTestId('add-confirm-preview', { includeHiddenElements: true })).toBeTruthy();
  });

  it('enables lock destination picker on Android for nextPrayer', async () => {
    Platform.OS = 'android';
    const view = await renderUi(
      <WidgetAddConfirmDialog
        destination="lock"
        entry={entry}
        mode="add"
        onCancel={() => undefined}
        onConfirm={() => undefined}
        onDestinationChange={() => undefined}
        testID="add-confirm"
        visible
      />,
      { locale: 'en' },
    );
    expect(view.getByTestId('add-confirm-destination-segment')).toBeTruthy();
    expect(view.getByText('Lock screen')).toBeTruthy();
  });

  it('fires confirm from the dialog actions', async () => {
    const onConfirm = jest.fn();
    const view = await renderUi(
      <WidgetAddConfirmDialog
        destination="home"
        entry={entry}
        mode="add"
        onCancel={() => undefined}
        onConfirm={onConfirm}
        onDestinationChange={() => undefined}
        testID="add-confirm"
        visible
      />,
      { locale: 'en' },
    );
    await fireEvent.press(view.getByTestId('add-confirm-confirm', { includeHiddenElements: true }));
    expect(onConfirm).toHaveBeenCalled();
  });
});
