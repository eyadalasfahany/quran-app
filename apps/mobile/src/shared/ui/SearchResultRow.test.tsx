import { screen } from '@testing-library/react-native';

import { press } from '../../../jest/azkar-ui-fixtures';
import { rawColorLiteralsInFeature } from '../../../jest/feature-ui-source';
import { flatStyle, renderUi } from '../../../jest/render-ui';

import { SearchResultRow } from './SearchResultRow';

const PREVIEW = 'نص قريب من النتيجة الصباح ختام';

describe('SearchResultRow', () => {
  it('shows the preview unaltered with the matched range in its own text run', async () => {
    const start = PREVIEW.indexOf('الصباح');
    await renderUi(<SearchResultRow highlight={{ end: start + 6, start }} number={1} onPress={jest.fn()} preview={PREVIEW} />);

    const row = screen.getByTestId('search-result');
    expect(row.props.accessibilityLabel).toBe(`١، ${PREVIEW}`);
    expect(screen.getByText('الصباح')).toBeOnTheScreen();
    expect(screen.getByRole('button')).toBeOnTheScreen();
  });

  it('shows the preview plain when there is no mappable range', async () => {
    await renderUi(<SearchResultRow highlight={null} number={2} onPress={jest.fn()} preview={PREVIEW} />);

    expect(screen.queryByText('الصباح')).toBeNull();
    expect(screen.getByRole('button', { name: `٢، ${PREVIEW}` })).toBeOnTheScreen();
  });

  it('shows the caption under the preview and reads it after the preview', async () => {
    await renderUi(<SearchResultRow caption="الموت والمتوفى" highlight={null} number={1} onPress={jest.fn()} preview={PREVIEW} />);

    expect(screen.getByText('الموت والمتوفى')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: `١، ${PREVIEW}، الموت والمتوفى` })).toBeOnTheScreen();
  });

  it('opens the hit on press', async () => {
    const onPress = jest.fn();
    await renderUi(<SearchResultRow highlight={null} number={1} onPress={onPress} preview={PREVIEW} />);

    await press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders the English number', async () => {
    await renderUi(<SearchResultRow highlight={null} number={3} onPress={jest.fn()} preview={PREVIEW} />, { locale: 'en' });
    expect(screen.getByRole('button', { name: `3, ${PREVIEW}` })).toBeOnTheScreen();
  });

  it('keeps the Arabic preview right-aligned and RTL in English', async () => {
    await renderUi(<SearchResultRow highlight={null} number={1} onPress={jest.fn()} preview={PREVIEW} />, { locale: 'en' });

    expect(flatStyle(screen.getByText(PREVIEW).props.style)).toMatchObject({ textAlign: 'right', writingDirection: 'rtl' });
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/shared/ui/SearchResultRow.tsx')).toEqual([]);
  });
});
