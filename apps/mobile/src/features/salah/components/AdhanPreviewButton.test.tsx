import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { AdhanPreviewButton } from './AdhanPreviewButton';

describe('AdhanPreviewButton', () => {
  it('is a button labelled to play the named voice when idle', async () => {
    const view = await renderUi(<AdhanPreviewButton name="الله أكبر" onPress={() => undefined} playing={false} testID="preview" />);

    const button = view.getByRole('button', { name: 'تشغيل الله أكبر' });
    expect(button).toBeOnTheScreen();
    expect(view.getByTestId('preview-glyph')).toBeOnTheScreen();
  });

  it('is labelled to stop the named voice while it plays', async () => {
    const view = await renderUi(<AdhanPreviewButton name="الله أكبر" onPress={() => undefined} playing testID="preview" />);

    expect(view.getByRole('button', { name: 'إيقاف الله أكبر' })).toBeOnTheScreen();
  });

  it('draws a 44 pt circle', async () => {
    const view = await renderUi(<AdhanPreviewButton name="x" onPress={() => undefined} playing={false} testID="preview" />);

    const style = flatStyle(view.getByTestId('preview').props.style);
    expect(style.width).toBe(44);
    expect(style.height).toBe(44);
    expect(style.borderRadius).toBe(22);
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<AdhanPreviewButton name="x" onPress={onPress} playing={false} testID="preview" />);

    fireEvent.press(view.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('labels the button in %s', async (locale) => {
    const view = await renderUi(<AdhanPreviewButton name="x" onPress={() => undefined} playing={false} />, { locale });

    expect(view.getByRole('button', { name: locale === 'en' ? 'Play x' : 'تشغيل x' })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/salah/components/AdhanPreviewButton.tsx')).toEqual([]);
  });
});
