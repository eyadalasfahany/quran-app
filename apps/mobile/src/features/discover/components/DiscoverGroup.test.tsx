import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Text } from 'react-native';

import { locales, renderUi } from '../../../../jest/render-ui';

import { DiscoverGroup } from './DiscoverGroup';

describe('DiscoverGroup', () => {
  it('shows its heading as a header with its rows', async () => {
    const view = await renderUi(
      <DiscoverGroup testID="group" title="القراءة">
        <Text>الصف الأول</Text>
        <Text>الصف الثاني</Text>
      </DiscoverGroup>,
    );
    expect(view.getByRole('header', { name: 'القراءة' })).toBeOnTheScreen();
    expect(view.getByText('الصف الأول')).toBeOnTheScreen();
    expect(view.getByText('الصف الثاني')).toBeOnTheScreen();
    expect(view.getByTestId('group')).toBeOnTheScreen();
  });

  it('keeps the rows in order, with a hairline between them', async () => {
    const view = await renderUi(
      <DiscoverGroup title="g">
        <Text>a</Text>
        <Text>b</Text>
        <Text>c</Text>
      </DiscoverGroup>,
    );
    // The hairlines are plain views with no text, so the rows themselves are the ordered text nodes.
    const texts = view.getAllByText(/^[abc]$/).map((node) => node.props.children);
    expect(texts).toEqual(['a', 'b', 'c']);
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(
      <DiscoverGroup title="Group">
        <Text>row</Text>
      </DiscoverGroup>,
      { locale },
    );
    expect(view.getByText('row')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    const source = readFileSync(join(__dirname, 'DiscoverGroup.tsx'), 'utf8');
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });
});
