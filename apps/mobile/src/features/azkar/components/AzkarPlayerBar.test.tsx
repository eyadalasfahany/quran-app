import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';

import { AzkarPlayerBar } from './AzkarPlayerBar';

const handlers = () => ({
  onToggle: jest.fn(),
  onPrevious: jest.fn(),
  onNext: jest.fn(),
  onOpen: jest.fn(),
});

describe('AzkarPlayerBar', () => {
  it('shows the play control, the repetition and the progress', async () => {
    await renderUi(
      <AzkarPlayerBar canNext canPrevious durationMs={65_000} positionMs={10_000} playing={false} repetition={{ current: 2, total: 3 }} {...handlers()} />,
    );
    expect(screen.getByRole('button', { name: 'تشغيل التسجيل' })).toBeTruthy();
    expect(screen.getByText('٢ من ٣')).toBeTruthy();
    expect(screen.getByTestId('azkar-player-bar-progress-elapsed').props.children).toBe('٠:١٠');
  });

  it('draws no repetition for a dhikr with no sourced count', async () => {
    await renderUi(<AzkarPlayerBar canNext canPrevious durationMs={1000} positionMs={0} playing={false} repetition={null} {...handlers()} />);
    expect(screen.queryByTestId('azkar-player-bar-repetition')).toBeNull();
  });

  it('labels the control pause while playing', async () => {
    await renderUi(<AzkarPlayerBar canNext canPrevious durationMs={1000} positionMs={0} playing repetition={null} {...handlers()} />);
    expect(screen.getByRole('button', { name: 'إيقاف التسجيل مؤقتًا' })).toBeTruthy();
  });

  it('calls the handlers for play, previous, next and open', async () => {
    const h = handlers();
    await renderUi(<AzkarPlayerBar canNext canPrevious durationMs={1000} positionMs={0} playing={false} repetition={null} {...h} />);
    await press(screen.getByRole('button', { name: 'تشغيل التسجيل' }));
    await press(screen.getByRole('button', { name: 'الذكر السابق' }));
    await press(screen.getByRole('button', { name: 'الذكر التالي' }));
    await press(screen.getByRole('button', { name: 'فتح المشغّل' }));
    expect(h.onToggle).toHaveBeenCalledTimes(1);
    expect(h.onPrevious).toHaveBeenCalledTimes(1);
    expect(h.onNext).toHaveBeenCalledTimes(1);
    expect(h.onOpen).toHaveBeenCalledTimes(1);
  });

  it('disables previous and next at the ends of the queue', async () => {
    await renderUi(<AzkarPlayerBar canNext={false} canPrevious={false} durationMs={1000} positionMs={0} playing={false} repetition={null} {...handlers()} />);
    expect(screen.getByRole('button', { name: 'الذكر السابق' }).props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    expect(screen.getByRole('button', { name: 'الذكر التالي' }).props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
  });

  it('keeps the open target at least 44 pt tall', async () => {
    await renderUi(<AzkarPlayerBar canNext canPrevious durationMs={1000} positionMs={0} playing={false} repetition={null} {...handlers()} />);
    const open = screen.getByRole('button', { name: 'فتح المشغّل' });
    expect(open.props.style).toEqual(expect.objectContaining({ minHeight: 44 }));
  });

  it('renders in English with the English labels', async () => {
    await renderUi(
      <AzkarPlayerBar canNext canPrevious durationMs={1000} positionMs={0} playing={false} repetition={{ current: 1, total: 2 }} {...handlers()} />,
      { locale: 'en' },
    );
    expect(screen.getByRole('button', { name: 'Play recording' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next dhikr' })).toBeTruthy();
  });
});
