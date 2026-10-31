import { Text } from 'react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { PlayerHost } from './PlayerHost';
import { PlayerScrollView } from './PlayerScrollView';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

describe('PlayerScrollView', () => {
  it.each(locales)('passes its props and content through inside the player, in %s', async (locale) => {
    const view = await renderUi(
      <PlayerHost>
        <PlayerScrollView contentContainerStyle={{ paddingTop: 52 }} testID="scroll">
          <Text>الآية</Text>
        </PlayerScrollView>
      </PlayerHost>,
      { locale },
    );

    expect(view.getByTestId('scroll').props.contentContainerStyle).toEqual({ paddingTop: 52 });
    expect(view.getByText('الآية')).toBeOnTheScreen();
  });

  it('does not bounce, so a downward drag at the top moves the player instead', async () => {
    const view = await renderUi(
      <PlayerHost>
        <PlayerScrollView testID="scroll">
          <Text>content</Text>
        </PlayerScrollView>
      </PlayerHost>,
      { locale: 'en' },
    );

    expect(view.getByTestId('scroll').props.bounces).toBe(false);
    expect(view.getByTestId('scroll').props.showsVerticalScrollIndicator).toBe(false);
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/PlayerScrollView.tsx')).toEqual([]);
  });
});
