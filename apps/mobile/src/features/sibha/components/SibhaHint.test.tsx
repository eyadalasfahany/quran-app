import { renderUi } from '../../../../jest/render-ui';
import { SibhaHint } from './SibhaHint';

describe('SibhaHint', () => {
  it('tells the user that a tap anywhere counts', async () => {
    const view = await renderUi(<SibhaHint />);

    expect(view.getByText('اضغط في أي مكان للعدّ')).toBeOnTheScreen();
  });

  it('is hidden from screen readers, because the counter carries the instruction', async () => {
    const view = await renderUi(<SibhaHint />);

    expect(view.getByTestId('sibha-hint').props.importantForAccessibility).toBe('no');
  });

  it('shows the English line in English', async () => {
    const view = await renderUi(<SibhaHint />, { locale: 'en' });

    expect(view.getByText('Tap anywhere to count')).toBeOnTheScreen();
  });
});
