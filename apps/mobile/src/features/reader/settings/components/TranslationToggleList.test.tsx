import { fireEvent } from '@testing-library/react-native';

import { themes } from '@/core/theme';

import { rawColorLiteralsInFeature } from '../../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../../jest/render-ui';
import { TranslationToggleList } from './TranslationToggleList';

const translations = [
  { authorName: 'Author', id: 12, name: 'English' },
  { authorName: null, id: 11, name: 'العربية' },
];

describe('TranslationToggleList', () => {
  it.each(locales)('renders each translation as a platform switch in %s', async (locale) => {
    const view = await renderUi(
      <TranslationToggleList onChange={() => undefined} selectedIds={[12]} translations={translations} />,
      { locale },
    );
    expect(view.getByTestId('reader-translation-12').props.accessibilityRole).toBe('switch');
    expect(view.getByTestId('reader-translation-12').props.accessibilityState).toEqual({ checked: true });
    expect(view.getByTestId('reader-translation-12').props.value).toBe(true);
    expect(view.getByTestId('reader-translation-11').props.accessibilityState).toEqual({ checked: false });
    expect(view.getByRole('switch', { name: 'English, Author' })).toBeOnTheScreen();
    expect(view.getByRole('switch', { name: 'العربية' })).toBeOnTheScreen();
  });

  it('shows the author under the name in muted ink', async () => {
    const view = await renderUi(
      <TranslationToggleList onChange={() => undefined} selectedIds={[]} translations={translations} />,
      { locale: 'en' },
    );

    expect(flatStyle(view.getByText('Author').props.style).color).toBe(themes.light.colors.inkMuted);
  });

  it('turns an id on and off', async () => {
    const onChange = jest.fn();
    const view = await renderUi(
      <TranslationToggleList onChange={onChange} selectedIds={[12]} translations={translations} />,
    );
    await fireEvent(view.getByTestId('reader-translation-11'), 'valueChange', true);
    expect(onChange).toHaveBeenLastCalledWith([12, 11]);

    await fireEvent(view.getByTestId('reader-translation-12'), 'valueChange', false);
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it.each(locales)('says when no translation is installed in %s', async (locale) => {
    const view = await renderUi(<TranslationToggleList onChange={() => undefined} selectedIds={[]} translations={[]} />, {
      locale,
    });

    expect(view.queryAllByRole('switch')).toHaveLength(0);
    expect(view.getByTestId('reader-translations')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/settings/components/TranslationToggleList.tsx')).toEqual([]);
  });
});
