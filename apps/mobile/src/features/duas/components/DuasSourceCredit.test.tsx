import { screen } from '@testing-library/react-native';

import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { DuasSourceCredit } from './DuasSourceCredit';

describe('DuasSourceCredit', () => {
  it('shows the source line as text', async () => {
    await renderUi(<DuasSourceCredit text="FIXTURE sources line" />);

    expect(screen.getByRole('text', { name: 'FIXTURE sources line' })).toBeOnTheScreen();
  });

  it('sets the caption size on the frame line pitch, in muted ink', async () => {
    await renderUi(<DuasSourceCredit text="FIXTURE sources line" />);

    expect(flatStyle(screen.getByText('FIXTURE sources line').props.style)).toMatchObject({ fontSize: 13, lineHeight: 19 });
  });

  it('renders in English', async () => {
    await renderUi(<DuasSourceCredit text="FIXTURE english sources" />, { locale: 'en' });

    expect(screen.getByText('FIXTURE english sources')).toBeOnTheScreen();
  });

  it('takes a test id from its caller', async () => {
    await renderUi(<DuasSourceCredit testID="duas-source-credit-home" text="FIXTURE" />);

    expect(screen.getByTestId('duas-source-credit-home')).toBeOnTheScreen();
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/duas/components/DuasSourceCredit.tsx')).toEqual([]);
  });
});
