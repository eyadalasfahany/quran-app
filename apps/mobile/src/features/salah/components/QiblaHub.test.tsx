import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { QiblaHub } from './QiblaHub';

describe('QiblaHub', () => {
  it('renders the user position hub, which takes no pointer events', async () => {
    const view = await renderUi(<QiblaHub />);

    const hub = view.getByTestId('qibla-compass-hub');
    expect(hub).toBeOnTheScreen();
    expect(hub.props.pointerEvents).toBe('none');
  });

  it('renders the same in both themes (its colours come from tokens)', async () => {
    const dark = await renderUi(<QiblaHub />, { theme: 'dark' });
    expect(dark.getByTestId('qibla-compass-hub')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/salah/components/QiblaHub.tsx')).toEqual([]);
  });
});
