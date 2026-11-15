import { screen } from '@testing-library/react-native';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { AzkarSessionRow } from './AzkarSessionRow';

const PARTS = ['azkar-session-row-ring', 'azkar-session-row-text', 'azkar-session-row-chevron'];

type TreeNode = { props: { testID?: unknown }; children: (TreeNode | string)[] };

/** The parts of the row in tree order, which is the order the row lays them out (RTL reads them from the right). */
function partOrder(row: unknown): string[] {
  const seen: string[] = [];
  const walk = (node: TreeNode | string) => {
    if (typeof node === 'string') {
      return;
    }
    const id = node.props.testID;
    if (typeof id === 'string' && PARTS.includes(id) && !seen.includes(id)) {
      seen.push(id);
    }
    node.children.forEach(walk);
  };
  walk(row as TreeNode);
  return seen;
}

describe('AzkarSessionRow', () => {
  it('shows the title, the progress text and a labelled button', async () => {
    await renderUi(<AzkarSessionRow completed={false} fraction={0.5} onPress={jest.fn()} progressText="١٢ من ٢٤" title="الصباح" />);

    expect(screen.getByText('الصباح')).toBeOnTheScreen();
    expect(screen.getByText('١٢ من ٢٤')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'الصباح، ١٢ من ٢٤' })).toBeOnTheScreen();
  });

  it('lays out the ring first, then the text column, then the chevron', async () => {
    await renderUi(<AzkarSessionRow completed={false} fraction={0.5} onPress={jest.fn()} progressText="١٢ من ٢٤" title="الصباح" />);

    expect(partOrder(screen.getByRole('button', { name: 'الصباح، ١٢ من ٢٤' }))).toEqual(PARTS);
  });

  it('aligns the progress count to the end of the text column', async () => {
    await renderUi(<AzkarSessionRow completed={false} fraction={0.5} onPress={jest.fn()} progressText="١٢ من ٢٤" title="الصباح" />);

    expect(flatStyle(screen.getByText('١٢ من ٢٤').props.style)).toMatchObject({ alignSelf: 'flex-end' });
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
    expect(partOrder(screen.getByRole('button', { name: 'Evening, 2 of 10' }))).toEqual(PARTS);
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarSessionRow.tsx')).toEqual([]);
  });
});
