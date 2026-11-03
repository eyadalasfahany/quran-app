import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { fireEvent } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { computeDiscoverProgress, type DiscoverProgress } from '../progress';
import { DISCOVER_ENTRIES, type DiscoverId } from '../registry';
import type { DiscoverState } from '../store';

import { DiscoverCard } from './DiscoverCard';

const ALL_IDS = DISCOVER_ENTRIES.map((entry) => entry.id);

function progressFor(state: Partial<DiscoverState>): DiscoverProgress {
  return computeDiscoverProgress(DISCOVER_ENTRIES, {
    done: [],
    acknowledged: null,
    hidden: false,
    tourStep: null,
    ...state,
  });
}

function handlers() {
  return { onOpenRow: jest.fn(), onViewAll: jest.fn(), onHide: jest.fn(), onFinish: jest.fn() };
}

describe('DiscoverCard', () => {
  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<DiscoverCard progress={progressFor({})} {...handlers()} />, { locale });
    expect(view.getByTestId('discover-card')).toBeOnTheScreen();
  });

  it('shows the title, the progress and the next three rows', async () => {
    const done: DiscoverId[] = ['reader.mushaf', 'reader.reading', 'my-quran'];
    const view = await renderUi(<DiscoverCard progress={progressFor({ done })} {...handlers()} />, { locale: 'ar' });
    expect(view.getByRole('header', { name: 'اكتشف طيبة' })).toBeOnTheScreen();
    expect(view.getByText('٣ من ١٣')).toBeOnTheScreen();
    expect(view.getByTestId('discover-card-row-reader.focus')).toBeOnTheScreen();
    expect(view.getByTestId('discover-card-row-reader.tafsir')).toBeOnTheScreen();
    expect(view.getByTestId('discover-card-row-listen.follow')).toBeOnTheScreen();
    expect(view.queryByTestId('discover-card-row-worship.salah')).toBeNull();
  });

  it('badges only the new rows and says so', async () => {
    const acknowledged = ALL_IDS.filter((id) => id !== 'app.widget' && id !== 'reader.tafsir');
    const view = await renderUi(
      <DiscoverCard progress={progressFor({ acknowledged, done: acknowledged })} {...handlers()} />,
      { locale: 'ar' },
    );
    expect(view.getByText('ميزات جديدة تنتظرك')).toBeOnTheScreen();
    expect(view.getAllByText('جديد')).toHaveLength(2);
  });

  it('shows the done state with «أحسنت» once every row is complete', async () => {
    const view = await renderUi(<DiscoverCard progress={progressFor({ done: ALL_IDS })} {...handlers()} />, { locale: 'ar' });
    expect(view.getByTestId('discover-done-state')).toBeOnTheScreen();
    expect(view.getByText('أحسنت')).toBeOnTheScreen();
  });

  it('renders nothing when hidden', async () => {
    const view = await renderUi(
      <DiscoverCard progress={progressFor({ acknowledged: ALL_IDS, hidden: true })} {...handlers()} testID="card" />,
    );
    expect(view.queryByTestId('card')).toBeNull();
  });

  it('opens a row, and calls hide and view-all', async () => {
    const callbacks = handlers();
    const view = await renderUi(<DiscoverCard progress={progressFor({})} {...callbacks} />, { locale: 'ar' });
    fireEvent.press(view.getByTestId('discover-card-row-reader.mushaf'));
    expect(callbacks.onOpenRow).toHaveBeenCalledWith(expect.objectContaining({ entry: expect.objectContaining({ id: 'reader.mushaf' }) }));
    fireEvent.press(view.getByRole('button', { name: 'إخفاء' }));
    expect(callbacks.onHide).toHaveBeenCalledTimes(1);
    // Visible «عرض الكل»; VoiceOver hears which list, since Home has another «عرض الكل».
    expect(view.getByText('عرض الكل')).toBeOnTheScreen();
    fireEvent.press(view.getByRole('button', { name: 'عرض كل خطوات اكتشف طيبة' }));
    expect(callbacks.onViewAll).toHaveBeenCalledTimes(1);
  });

  it('has no raw colour literals', () => {
    const source = readFileSync(join(__dirname, 'DiscoverCard.tsx'), 'utf8');
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });
});
