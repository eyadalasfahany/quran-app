import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { DuasCategoryHeader } from './DuasCategoryHeader';

describe('DuasCategoryHeader', () => {
  it('shows the title as a header', async () => {
    await renderUi(<DuasCategoryHeader onBack={jest.fn()} title="FIXTURE title" />);

    expect(screen.getByRole('header', { name: 'FIXTURE title' })).toBeOnTheScreen();
  });

  it('shows the subtitle under the title when given', async () => {
    await renderUi(<DuasCategoryHeader onBack={jest.fn()} subtitle="FIXTURE subtitle" title="FIXTURE title" />);

    expect(screen.getByText('FIXTURE subtitle')).toBeOnTheScreen();
  });

  it('leaves out the subtitle when none is given', async () => {
    await renderUi(<DuasCategoryHeader onBack={jest.fn()} title="FIXTURE title" />);

    expect(screen.queryByText('FIXTURE subtitle')).toBeNull();
  });

  it('calls onBack from the back button, labelled in Arabic', async () => {
    const onBack = jest.fn();
    await renderUi(<DuasCategoryHeader onBack={onBack} title="FIXTURE title" />);

    await fireEvent.press(screen.getByRole('button', { name: 'رجوع' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('labels the back button in English', async () => {
    await renderUi(<DuasCategoryHeader onBack={jest.fn()} title="FIXTURE title" />, { locale: 'en' });

    expect(screen.getByRole('button', { name: 'Back' })).toBeOnTheScreen();
  });

  it('renders trailing controls at the end of the row', async () => {
    await renderUi(<DuasCategoryHeader onBack={jest.fn()} title="FIXTURE title" trailing={<Text>FIXTURE trailing</Text>} />);

    expect(screen.getByText('FIXTURE trailing')).toBeOnTheScreen();
  });

  it('sets the title at the Azkar header size (28 pt, displayMd)', async () => {
    await renderUi(<DuasCategoryHeader onBack={jest.fn()} title="FIXTURE title" />);

    expect(flatStyle(screen.getByText('FIXTURE title').props.style)).toMatchObject({ fontSize: 28, lineHeight: 36 });
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/duas/components/DuasCategoryHeader.tsx')).toEqual([]);
  });
});
