import { screen } from '@testing-library/react-native';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { AzkarSearchResultRow } from './AzkarSearchResultRow';

const PREVIEW = 'نص قريب من النتيجة الصباح ختام';

describe('AzkarSearchResultRow', () => {
  it('shows the preview unaltered with the matched range in its own text run', async () => {
    const start = PREVIEW.indexOf('الصباح');
    await renderUi(<AzkarSearchResultRow highlight={{ end: start + 6, start }} number={1} onPress={jest.fn()} preview={PREVIEW} />);

    const row = screen.getByTestId('azkar-search-result');
    expect(row.props.accessibilityLabel).toBe(`١, ${PREVIEW}`);
    expect(screen.getByText('الصباح')).toBeOnTheScreen();
    expect(screen.getByRole('button')).toBeOnTheScreen();
  });

  it('shows the preview plain when there is no mappable range', async () => {
    await renderUi(<AzkarSearchResultRow highlight={null} number={2} onPress={jest.fn()} preview={PREVIEW} />);

    expect(screen.queryByText('الصباح')).toBeNull();
    expect(screen.getByRole('button', { name: `٢, ${PREVIEW}` })).toBeOnTheScreen();
  });

  it('opens the entry on press', async () => {
    const onPress = jest.fn();
    await renderUi(<AzkarSearchResultRow highlight={null} number={1} onPress={onPress} preview={PREVIEW} />);

    await press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders the English number', async () => {
    await renderUi(<AzkarSearchResultRow highlight={null} number={3} onPress={jest.fn()} preview={PREVIEW} />, { locale: 'en' });
    expect(screen.getByRole('button', { name: `3, ${PREVIEW}` })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarSearchResultRow.tsx')).toEqual([]);
  });
});
