import { fireEvent } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { TranslationPanel, type AyahTranslation } from './TranslationPanel';

const translations: AyahTranslation[] = [
  {
    meta: { authorName: 'Saheeh International', direction: 'ltr', name: 'Sahih International', resourceId: 20 },
    text: '[All] praise is [due] to Allah, Lord of the worlds -',
  },
  {
    meta: { authorName: null, direction: 'rtl', name: 'اردو', resourceId: 97 },
    text: 'سب تعریفیں اللہ کے لیے ہیں',
  },
  { meta: { authorName: null, direction: 'ltr', name: 'Missing', resourceId: 5 }, text: null },
];

describe('TranslationPanel', () => {
  it('renders each selected translation with its name and source caption', async () => {
    const view = await renderUi(
      <TranslationPanel onShowInlineChange={jest.fn()} showInline translations={translations} />,
      { locale: 'en' },
    );

    expect(view.getByText('Sahih International')).toBeOnTheScreen();
    expect(view.getByTestId('translation-panel-source-20')).toHaveTextContent('Sahih International · Saheeh International');
    expect(view.getByTestId('translation-panel-source-97')).toHaveTextContent('اردو');
    expect(view.getByTestId('translation-panel-text-20')).toHaveTextContent(translations[0]!.text!);
  });

  it.each(locales)('follows each resource direction, not the interface, in %s', async (locale) => {
    const view = await renderUi(
      <TranslationPanel onShowInlineChange={jest.fn()} showInline translations={translations} />,
      { locale },
    );

    expect(flatStyle(view.getByTestId('translation-panel-text-20').props.style)).toMatchObject({
      textAlign: 'left',
      writingDirection: 'ltr',
    });
    expect(flatStyle(view.getByTestId('translation-panel-text-97').props.style)).toMatchObject({
      textAlign: 'right',
      writingDirection: 'rtl',
    });
  });

  it('says when a translation has no text for the ayah', async () => {
    const view = await renderUi(
      <TranslationPanel onShowInlineChange={jest.fn()} showInline translations={translations} />,
      { locale: 'en' },
    );

    expect(view.getByText('This translation has no text for this ayah.')).toBeOnTheScreen();
  });

  it('toggles the inline translations setting', async () => {
    const onShowInlineChange = jest.fn();
    const view = await renderUi(
      <TranslationPanel onShowInlineChange={onShowInlineChange} showInline={false} translations={translations} />,
    );
    const toggle = view.getByRole('switch', { name: 'إظهار الترجمة في وضع القراءة' });

    expect(toggle.props.accessibilityState).toMatchObject({ checked: false });
    await fireEvent(toggle, 'valueChange', true);

    expect(onShowInlineChange).toHaveBeenCalledWith(true);
  });

  it.each(locales)('shows the empty state when nothing is selected in %s', async (locale) => {
    const view = await renderUi(<TranslationPanel onShowInlineChange={jest.fn()} showInline translations={[]} />, {
      locale,
    });

    expect(view.getByText(locale === 'ar' ? 'لم تختر ترجمة بعد' : 'No translation chosen')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/panels/TranslationPanel.tsx')).toEqual([]);
  });
});
