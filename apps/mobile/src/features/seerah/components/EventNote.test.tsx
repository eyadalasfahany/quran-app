import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import { EventNote } from './EventNote';

describe('EventNote', () => {
  it.each(locales)('says the place is not stated (%s)', async (locale) => {
    await renderUi(<EventNote kind="place" />, { locale });
    expect(screen.getByText(locale === 'ar' ? 'لم يذكر الكتاب مكان هذا الحدث' : 'The book does not state where this happened')).toBeOnTheScreen();
    expect(screen.getByText(locale === 'ar' ? 'لذلك لا يظهر على الخريطة، ويُعرض مع «أخرى».' : 'So it is not on the map, and is shown under “Other”.')).toBeOnTheScreen();
  });

  it.each(locales)('says the year is not stated (%s)', async (locale) => {
    await renderUi(<EventNote kind="year" />, { locale });
    expect(screen.getByText(locale === 'ar' ? 'لم يذكر الكتاب وقت هذا الحدث' : 'The book does not state when this happened')).toBeOnTheScreen();
    expect(screen.getByText(/«غير محدد»|Not stated/)).toBeOnTheScreen();
  });

  it('says a place or time is approximate', async () => {
    await renderUi(<EventNote kind="uncertain" />);
    expect(screen.getByText('موضع أو وقت تقريبي')).toBeOnTheScreen();
  });

  it('is a summary with a dashed edge, one per kind', async () => {
    await renderUi(<EventNote kind="place" />);
    const note = screen.getByTestId('seerah-event-note-place');
    expect(note.props.accessibilityRole).toBe('summary');
    expect(flatStyle(note.props.style)).toMatchObject({ borderStyle: 'dashed', backgroundColor: themes.light.colors.surfaceRaised });
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/EventNote.tsx')).toEqual([]);
  });
});
