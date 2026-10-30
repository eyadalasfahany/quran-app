import { fireEvent } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { SavedVerseRow } from './SavedVerseRow';

describe('SavedVerseRow', () => {
  it.each(locales)('renders the title over the meta line (%s)', async (locale) => {
    const view = await renderUi(
      <SavedVerseRow onPress={jest.fn()} subtitle="صفحة ٤٢ · الجزء ٣" title="البقرة · الآية ٢٥٥" />,
      { locale },
    );

    const row = view.getByRole('button', { name: 'البقرة · الآية ٢٥٥, صفحة ٤٢ · الجزء ٣' });
    expect(row).toBeOnTheScreen();
    expect(view.getByText('صفحة ٤٢ · الجزء ٣')).toBeOnTheScreen();
  });

  it('fires onPress', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<SavedVerseRow onPress={onPress} title="الفاتحة · الآية ١" />);

    fireEvent.press(view.getByRole('button', { name: 'الفاتحة · الآية ١' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('gives the note preview two lines', async () => {
    const view = await renderUi(
      <SavedVerseRow onPress={jest.fn()} subtitle="تدبر" subtitleLines={2} title="البقرة · الآية ٢٥٥" />,
    );

    expect(view.getByText('تدبر').props.numberOfLines).toBe(2);
  });
});
