import { act, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { AzkarReaderControls } from './AzkarReaderControls';

function renderControls(props: Partial<Parameters<typeof AzkarReaderControls>[0]> = {}) {
  const handlers = { onPrevious: jest.fn(), onNext: jest.fn() };
  const ui = (
    <AzkarReaderControls canNext canPrevious {...handlers} {...props}>
      <Text>الوسط</Text>
    </AzkarReaderControls>
  );
  return { ui, handlers };
}

describe('AzkarReaderControls', () => {
  it('renders previous and next buttons around the centre slot', async () => {
    const { ui } = renderControls();
    await renderUi(ui);
    expect(screen.getByRole('button', { name: 'السابق' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'التالي' })).toBeTruthy();
    expect(screen.getByText('الوسط')).toBeTruthy();
  });

  it('calls onPrevious and onNext', async () => {
    const { ui, handlers } = renderControls();
    await renderUi(ui);
    await act(async () => {
      await press(screen.getByRole('button', { name: 'السابق' }));
      await press(screen.getByRole('button', { name: 'التالي' }));
    });
    expect(handlers.onPrevious).toHaveBeenCalledTimes(1);
    expect(handlers.onNext).toHaveBeenCalledTimes(1);
  });

  it('disables previous on the first unit', async () => {
    const { ui, handlers } = renderControls({ canPrevious: false });
    const view = await renderUi(ui);
    const previous = view.getByRole('button', { name: 'السابق' });
    expect(previous.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    await press(previous);
    expect(handlers.onPrevious).not.toHaveBeenCalled();
  });

  it('disables next when the reader is finished', async () => {
    const { ui } = renderControls({ canNext: false });
    await renderUi(ui);
    expect(screen.getByRole('button', { name: 'التالي' }).props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
  });

  it('uses the English labels', async () => {
    const { ui } = renderControls();
    await renderUi(ui, { locale: 'en' });
    expect(screen.getByRole('button', { name: 'Previous' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next' })).toBeTruthy();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarReaderControls.tsx')).toEqual([]);
  });
});
