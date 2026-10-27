import { Text } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { Card } from './Card';

const theme = themes.light;

describe('Card', () => {
  it('renders a raised card with a line border by default', async () => {
    const view = await renderUi(
      <Card testID="card">
        <Text>محتوى</Text>
      </Card>,
    );

    expect(view.getByText('محتوى')).toBeOnTheScreen();
    expect(flatStyle(view.getByTestId('card').props.style)).toMatchObject({
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.line,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      padding: theme.space[4],
    });
  });

  it('renders the page tone, another radius and padding, and no border', async () => {
    const view = await renderUi(<Card bordered={false} padding={3} radius="md" testID="card" tone="page" />);
    const style = flatStyle(view.getByTestId('card').props.style);

    expect(style).toMatchObject({
      backgroundColor: theme.colors.surfacePage,
      borderRadius: theme.radius.md,
      padding: theme.space[3],
    });
    expect(style.borderWidth).toBeUndefined();
  });

  it('passes accessibility props through', async () => {
    const view = await renderUi(<Card accessibilityLabel="بطاقة" accessible testID="card" />);

    expect(view.getByLabelText('بطاقة')).toBeOnTheScreen();
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<Card testID="card" />, { locale });

    expect(view.getByTestId('card')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('Card.tsx')).toEqual([]);
  });
});
