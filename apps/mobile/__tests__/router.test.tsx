import { renderRouter, screen } from 'expo-router/testing-library';

import Index from '../app/index';
import RootLayout from '../app/_layout';

describe('router', () => {
  it('renders the index route under the root layout', async () => {
    await renderRouter({ _layout: RootLayout, index: Index });

    expect(screen).toHavePathname('/');
    expect(screen.getByTestId('placeholder-screen')).toBeOnTheScreen();
  });
});
