import { act, fireEvent, screen } from '@testing-library/react-native';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { eventsFixture } from '../fixtures';

import { SeerahListView } from './SeerahListView';

// The header sits below the top safe area; the test device has no safe-area provider, so the inset is fixed here.
jest.mock('@/core/layout/useScreenInsets', () => ({
  useScreenInsets: () => ({ bottom: 34, end: 0, start: 0, top: 47 }),
}));

const titles = { ar: 'السيرة النبوية', en: 'Seerah' } as const;

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

  describe('the selected chip follows the list (frame SeerahList)', () => {
    const checked = (name: string) => screen.getByRole('radio', { name }).props.accessibilityState.checked;
    async function laidOut() {
      await renderUi(<SeerahListView {...base} />);
      // Section tops in the scroll content: the first stage at 12, «الكهولة» at 900, «غير محدد» at 1500.
      for (const [section, y] of [['childhood', 12], ['maturity', 900], ['unspecified', 1500]] as const) {
        await act(async () => {
          fireEvent(screen.getByTestId(`seerah-list-section-${section}`), 'layout', { nativeEvent: { layout: { height: 300, width: 390, x: 0, y } } });
        });
      }
    }
    const scrollTo = async (y: number) => {
      await act(async () => {
        fireEvent.scroll(screen.getByTestId('seerah-list-scroll'), { nativeEvent: { contentOffset: { x: 0, y } } });
      });
    };

    it('starts on the first stage', async () => {
      await laidOut();
      expect(checked('الطفولة')).toBe(true);
    });

    it('moves to the section scrolled to the top', async () => {
      await laidOut();
      await scrollTo(895);
      expect(checked('الكهولة')).toBe(true);
      await scrollTo(1495);
      expect(checked('غير محدد')).toBe(true);
      await scrollTo(0);
      expect(checked('الطفولة')).toBe(true);
    });

    it('keeps a tapped chip while the list scrolls past other sections to it', async () => {
      await laidOut();
      await press(screen.getByRole('radio', { name: 'غير محدد' }));
      await scrollTo(900);
      expect(checked('غير محدد')).toBe(true);
      await scrollTo(1492);
      await scrollTo(1300);
      expect(checked('الكهولة')).toBe(true);
    });
  });

  it.each(locales)('the header shows the title and both buttons, below the top inset (%s)', async (locale) => {
    await renderUi(<SeerahListView {...base} />, { locale });
    expect(screen.getByText(titles[locale])).toBeOnTheScreen();
    expect(screen.getByTestId('seerah-list-back')).toBeOnTheScreen();
    expect(screen.getByTestId('seerah-list-toggle')).toBeOnTheScreen();
    expect(flatStyle(screen.getByTestId('seerah-list-header').props.style)).toMatchObject({ paddingTop: 47 });
  });

  it.each(locales)('the period chips render in a row and the tapped one is selected (%s)', async (locale) => {
    await renderUi(<SeerahListView {...base} />, { locale });
    expect(screen.getByTestId('seerah-stage-chips')).toBeOnTheScreen();
    const chip = screen.getByRole('radio', { name: locale === 'ar' ? 'الكهولة' : 'Maturity' });
    await press(chip);
    expect(screen.getByRole('radio', { name: locale === 'ar' ? 'الكهولة' : 'Maturity' }).props.accessibilityState).toMatchObject({ checked: true });
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
