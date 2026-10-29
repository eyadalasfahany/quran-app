import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { ReciterRow } from './ReciterRow';

const base = {
  name: 'مشاري راشد العفاسي',
  letter: 'ع',
  selected: false,
  styleLabel: 'مرتّل',
  status: null,
  playLabel: 'تشغيل مشاري راشد العفاسي',
  downloadProgress: null,
  onSelect: () => undefined,
  onPlay: () => undefined,
  testID: 'row',
};

describe('ReciterRow', () => {
  it('shows the name, the style tag and the play button, with a 66 pt minimum height', async () => {
    const view = await renderUi(<ReciterRow {...base} />);

    expect(view.getByText('مشاري راشد العفاسي')).toBeOnTheScreen();
    expect(view.getByText('مرتّل')).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'تشغيل مشاري راشد العفاسي' })).toBeOnTheScreen();
    expect(flatStyle(view.getByTestId('row').props.style).minHeight).toBe(66);
  });

  it('marks the chosen reciter as a checked radio', async () => {
    const view = await renderUi(<ReciterRow {...base} selected />);
    const select = view.getByRole('radio', { name: 'مشاري راشد العفاسي' });

    expect(select.props.accessibilityState).toEqual({ checked: true });
  });

  it('selects the reciter when the name area is pressed, not the play button', async () => {
    const onSelect = jest.fn();
    const onPlay = jest.fn();
    const view = await renderUi(<ReciterRow {...base} onPlay={onPlay} onSelect={onSelect} />);

    await fireEvent.press(view.getByRole('radio', { name: 'مشاري راشد العفاسي' }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onPlay).not.toHaveBeenCalled();
  });

  it('plays the reciter when its play button is pressed, not the row', async () => {
    const onSelect = jest.fn();
    const onPlay = jest.fn();
    const view = await renderUi(<ReciterRow {...base} onPlay={onPlay} onSelect={onSelect} />);

    await fireEvent.press(view.getByRole('button', { name: 'تشغيل مشاري راشد العفاسي' }));

    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('omits the style tag when the style is unknown, and the status line when there is none', async () => {
    const view = await renderUi(<ReciterRow {...base} styleLabel={null} testID="row" />);

    expect(view.queryByTestId('row-style')).toBeNull();
    expect(view.queryByTestId('row-status')).toBeNull();
  });

  it('shows the status line in muted ink, and in danger ink for a failed download', async () => {
    const playing = await renderUi(<ReciterRow {...base} status={{ label: 'يُتلى الآن', tone: 'muted' }} />);
    expect(playing.getByText('يُتلى الآن')).toBeOnTheScreen();

    const failed = await renderUi(<ReciterRow {...base} status={{ label: 'تعذّر التنزيل', tone: 'danger' }} />);
    expect(failed.getByText('تعذّر التنزيل')).toBeOnTheScreen();
  });

  it('passes the download progress to the play button', async () => {
    const view = await renderUi(<ReciterRow {...base} downloadProgress={0.4} testID="row" />);

    expect(view.getByTestId('row-play-ring')).toBeOnTheScreen();
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<ReciterRow {...base} name="Mishari" playLabel="Play Mishari" />, { locale });

    expect(view.getByRole('radio', { name: 'Mishari' })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/audio/components/ReciterRow.tsx')).toEqual([]);
  });
});
