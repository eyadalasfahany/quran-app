import { screen } from '@testing-library/react-native';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { AzkarSessionRow } from './AzkarSessionRow';

describe('AzkarSessionRow', () => {
  it('shows the title, the progress text and a labelled button', async () => {
    await renderUi(<AzkarSessionRow completed={false} fraction={0.5} onPress={jest.fn()} progressText="١٢ من ٢٤" title="أذكار الصباح" />);

    expect(screen.getByText('أذكار الصباح')).toBeOnTheScreen();
    expect(screen.getByText('١٢ من ٢٤')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'أذكار الصباح، ١٢ من ٢٤' })).toBeOnTheScreen();
  });

  it('adds the completed state to its label and draws the check', async () => {
    await renderUi(<AzkarSessionRow completed fraction={1} onPress={jest.fn()} progressText="٦ من ٦" title="بعد الصلاة" />);

    expect(screen.getByRole('button', { name: 'بعد الصلاة، ٦ من ٦، مكتمل' })).toBeOnTheScreen();
    expect(screen.getByTestId('azkar-session-row-ring-check', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    await renderUi(<AzkarSessionRow completed={false} fraction={0} onPress={onPress} progressText="٠ من ٩" title="النوم" />);

    await press(screen.getByRole('button', { name: 'النوم، ٠ من ٩' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders the English labels', async () => {
    await renderUi(<AzkarSessionRow completed={false} fraction={0.2} onPress={jest.fn()} progressText="2 of 10" title="Evening" />, {
      locale: 'en',
    });

    expect(screen.getByRole('button', { name: 'Evening, 2 of 10' })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarSessionRow.tsx')).toEqual([]);
  });
});
