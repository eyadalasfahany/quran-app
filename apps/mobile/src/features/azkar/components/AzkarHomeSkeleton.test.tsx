import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { AzkarHomeSkeleton } from './AzkarHomeSkeleton';

describe('AzkarHomeSkeleton', () => {
  it('is one busy loading region with the loading label', async () => {
    const view = await renderUi(<AzkarHomeSkeleton />);
    const group = view.getByTestId('azkar-home-skeleton');

    expect(group.props.accessibilityLabel).toBe('جارٍ التحميل');
    expect(group.props.accessibilityState).toEqual({ busy: true });
  });

  it('hides its placeholder bars from screen readers', async () => {
    await renderUi(<AzkarHomeSkeleton />);
    expect(screen.getByLabelText('جارٍ التحميل')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders in English', async () => {
    await renderUi(<AzkarHomeSkeleton />, { locale: 'en' });
    expect(screen.getByLabelText('Loading')).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarHomeSkeleton.tsx')).toEqual([]);
  });
});
