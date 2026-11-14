import { screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';

import { SeerahSheet } from './SeerahSheet';

describe('SeerahSheet', () => {
  it.each(locales)('shows its content when visible (%s)', async (locale) => {
    await renderUi(
      <SeerahSheet onClose={jest.fn()} visible>
        <Text>content</Text>
      </SeerahSheet>,
      { locale },
    );
    expect(screen.getByText('content')).toBeOnTheScreen();
    expect(screen.getByTestId('seerah-sheet-grabber', { includeHiddenElements: true })).toBeTruthy();
  });

  it('renders nothing when hidden', async () => {
    await renderUi(
      <SeerahSheet onClose={jest.fn()} visible={false}>
        <Text>content</Text>
      </SeerahSheet>,
    );
    expect(screen.queryByText('content')).toBeNull();
  });

  it('closes from the scrim, which is a labelled button', async () => {
    const onClose = jest.fn();
    await renderUi(
      <SeerahSheet onClose={onClose} visible>
        <Text>content</Text>
      </SeerahSheet>,
    );
    await press(screen.getByRole('button', { name: 'إغلاق' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('draws no grabber when the content is its own card', async () => {
    await renderUi(
      <SeerahSheet card={false} onClose={jest.fn()} visible>
        <Text>content</Text>
      </SeerahSheet>,
    );
    expect(screen.queryByTestId('seerah-sheet-grabber', { includeHiddenElements: true })).toBeNull();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/SeerahSheet.tsx')).toEqual([]);
  });
});
