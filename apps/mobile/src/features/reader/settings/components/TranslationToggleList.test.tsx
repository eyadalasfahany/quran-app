import { fireEvent } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../../jest/feature-ui-source';
import { locales, renderUi } from '../../../../../jest/render-ui';
import { TranslationToggleList } from './TranslationToggleList';

const translations = [
  { authorName: 'Author', id: 12, name: 'English' },
  { authorName: null, id: 11, name: 'العربية' },
];

describe('TranslationToggleList', () => {
  it.each(locales)('renders each translation as a switch in %s', async (locale) => {
    const view = await renderUi(
      <TranslationToggleList onChange={() => undefined} selectedIds={[12]} translations={translations} />,
      { locale },
    );
    expect(view.getByTestId('reader-translation-12').props.accessibilityRole).toBe('switch');
    expect(view.getByTestId('reader-translation-12').props.accessibilityState).toEqual({ checked: true });
    expect(view.getByTestId('reader-translation-11').props.accessibilityState).toEqual({ checked: false });
  });

  it('toggles an id', async () => {
    const onChange = jest.fn();
    const view = await renderUi(
      <TranslationToggleList onChange={onChange} selectedIds={[12]} translations={translations} />,
    );
    await fireEvent.press(view.getByTestId('reader-translation-11'));
    expect(onChange).toHaveBeenCalledWith([12, 11]);
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/settings/components/TranslationToggleList.tsx')).toEqual([]);
  });
});
