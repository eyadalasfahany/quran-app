import { fireEvent } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { SibhaTopBar } from './SibhaTopBar';

describe('SibhaTopBar', () => {
  it('offers close and reset as labelled buttons', async () => {
    const view = await renderUi(<SibhaTopBar onClose={jest.fn()} onReset={jest.fn()} />);

    expect(view.getByRole('button', { name: 'إغلاق' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'إعادة الضبط' })).toBeOnTheScreen();
  });

  it('calls onClose from close', async () => {
    const onClose = jest.fn();
    const onReset = jest.fn();
    const view = await renderUi(<SibhaTopBar onClose={onClose} onReset={onReset} />);

    await fireEvent.press(view.getByRole('button', { name: 'إغلاق' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onReset).not.toHaveBeenCalled();
  });

  it('calls onReset from reset, which the screen confirms first', async () => {
    const onReset = jest.fn();
    const view = await renderUi(<SibhaTopBar onClose={jest.fn()} onReset={onReset} />);

    await fireEvent.press(view.getByRole('button', { name: 'إعادة الضبط' }));

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('shows English labels in English', async () => {
    const view = await renderUi(<SibhaTopBar onClose={jest.fn()} onReset={jest.fn()} />, { locale: 'en' });

    expect(view.getByRole('button', { name: 'Close' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'Reset' })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/sibha/components/SibhaTopBar.tsx')).toEqual([]);
  });
});
