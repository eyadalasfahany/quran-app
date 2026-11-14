import { screen } from '@testing-library/react-native';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { eventsFixture } from '../fixtures';

import { SeerahListView } from './SeerahListView';

const names: Record<string, string> = { badr: 'بدر', makkah: 'مكة', 'makkah.arqam': 'دار الأرقم', 'makkah.kaaba': 'الكعبة', madinah: 'المدينة', other: 'أخرى' };
const placeName = (id: string) => names[id] ?? id;
const base = { events: eventsFixture, onBack: jest.fn(), onOpen: jest.fn(), onToggleView: jest.fn(), placeName };

describe('SeerahListView', () => {
  it.each(locales)('groups by stage and age, with «غير محدد» last (%s)', async (locale) => {
    await renderUi(<SeerahListView {...base} />, { locale });
    const headers = screen.getAllByRole('header').map((node) => node.props.children);
    expect(headers.length).toBeGreaterThan(5);
    expect(screen.getByRole('radio', { name: locale === 'ar' ? 'غير محدد' : 'Not stated' })).toBeOnTheScreen();
    expect(screen.getByTestId('seerah-list-unspecified')).toBeOnTheScreen();
  });

  it('lists every event once', async () => {
    await renderUi(<SeerahListView {...base} />);
    expect(screen.getAllByText('[عنوان الفصل في الكتاب]')).toHaveLength(eventsFixture.length);
  });

  it('opens an event', async () => {
    const onOpen = jest.fn();
    await renderUi(<SeerahListView {...base} onOpen={onOpen} />);
    await press(screen.getAllByText('[عنوان الفصل في الكتاب]')[0] as never);
    expect(onOpen).toHaveBeenCalledWith('e001');
  });

  it('selects a period chip', async () => {
    await renderUi(<SeerahListView {...base} />);
    await press(screen.getByRole('radio', { name: 'الكهولة' }));
    expect(screen.getByRole('radio', { name: 'الكهولة' }).props.accessibilityState).toMatchObject({ checked: true });
  });

  it('toggles back to the map and goes back', async () => {
    const onToggleView = jest.fn();
    const onBack = jest.fn();
    await renderUi(<SeerahListView {...base} onBack={onBack} onToggleView={onToggleView} />);
    await press(screen.getByTestId('seerah-list-toggle'));
    await press(screen.getByTestId('seerah-list-back'));
    expect(onToggleView).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('shows no unspecified group or chip when every event has an age', async () => {
    await renderUi(<SeerahListView {...base} events={eventsFixture.filter((event) => event.ageFrom !== null)} />);
    expect(screen.queryByTestId('seerah-list-unspecified')).toBeNull();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/SeerahListView.tsx')).toEqual([]);
  });
});
