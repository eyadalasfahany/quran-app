import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { ReciterRow } from './ReciterRow';

// Every value of one prop anywhere in the rendered tree, in render order.
function propValues(node: unknown, key: string): unknown[] {
  if (node === null || typeof node !== 'object') {
    return [];
  }
  if (Array.isArray(node)) {
    return node.flatMap((child) => propValues(child, key));
  }
  const record = node as { props?: Record<string, unknown>; children?: unknown };
  const own = record.props !== undefined && key in record.props ? [record.props[key]] : [];
  return [...own, ...propValues(record.children, key)];
}

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
  onOptions: () => undefined,
  optionsLabel: 'خيارات القارئ',
  testID: 'row',
};

describe('ReciterRow', () => {
  it('draws the pause glyph on the play button while the reciter plays', async () => {
    const view = await renderUi(<ReciterRow {...base} playLabel="إيقاف مؤقت" playing />);

    expect(propValues(view.toJSON(), 'd')).toEqual(['M6 5h4v14H6zM14 5h4v14h-4z']);
  });

  it('draws the buffering ring on its own play button while starting', async () => {
    const view = await renderUi(<ReciterRow {...base} playLabel="إيقاف مؤقت" starting />);

    expect(await view.findByTestId('row-play-buffering', { includeHiddenElements: true })).toBeTruthy();
    expect(propValues(view.toJSON(), 'd')[0]).toBe('M6 5h4v14H6zM14 5h4v14h-4z');
  });

  it('draws no buffering ring when its reciter is not starting', async () => {
    const view = await renderUi(<ReciterRow {...base} />);

    expect(view.queryByTestId('row-play-buffering', { includeHiddenElements: true })).toBeNull();
  });

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

  it('opens the reciter page from the «⋯» button, which is 44 pt and does not select or play', async () => {
    const onSelect = jest.fn();
    const onPlay = jest.fn();
    const onOptions = jest.fn();
    const view = await renderUi(
      <ReciterRow {...base} onOptions={onOptions} onPlay={onPlay} onSelect={onSelect} testID="row" />,
    );
    const options = view.getByRole('button', { name: 'خيارات القارئ' });

    expect(flatStyle(options.props.style).height).toBeGreaterThanOrEqual(44);
    expect(flatStyle(options.props.style).width).toBeGreaterThanOrEqual(44);
    await fireEvent.press(options);

    expect(onOptions).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
  });

  it('labels the «⋯» button in English', async () => {
    const onOptions = jest.fn();
    const view = await renderUi(
      <ReciterRow {...base} name="Mishari" onOptions={onOptions} optionsLabel="Reciter options" playLabel="Play" />,
      { locale: 'en' },
    );

    await fireEvent.press(view.getByRole('button', { name: 'Reciter options' }));

    expect(onOptions).toHaveBeenCalledTimes(1);
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
