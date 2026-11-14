import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';

import { EventTopBar } from './EventTopBar';

describe('EventTopBar', () => {
  it.each(locales)('shows the crumb and both buttons (%s)', async (locale) => {
    await renderUi(<EventTopBar crumb="المدينة · الغزوات" onBack={jest.fn()} onShowList={jest.fn()} />, { locale });
    expect(screen.getByText('المدينة · الغزوات')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: locale === 'ar' ? 'رجوع إلى الخريطة' : 'Back to the map' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: locale === 'ar' ? 'عرض كقائمة' : 'Show as list' })).toBeOnTheScreen();
  });

  it('calls the handlers', async () => {
    const onBack = jest.fn();
    const onShowList = jest.fn();
    await renderUi(<EventTopBar crumb="x" onBack={onBack} onShowList={onShowList} />);
    await press(screen.getByRole('button', { name: 'رجوع إلى الخريطة' }));
    await press(screen.getByRole('button', { name: 'عرض كقائمة' }));
    expect([onBack, onShowList].map((fn) => fn.mock.calls.length)).toEqual([1, 1]);
  });

  it('has 44 pt buttons and no raw colour literal', async () => {
    await renderUi(<EventTopBar crumb="x" onBack={jest.fn()} onShowList={jest.fn()} />);
    expect(flatStyle(screen.getByTestId('seerah-event-topbar-back').props.style)).toMatchObject({ height: 44, width: 44 });
    expect(rawColorLiteralsInFeature('src/features/seerah/components/EventTopBar.tsx')).toEqual([]);
  });
});
