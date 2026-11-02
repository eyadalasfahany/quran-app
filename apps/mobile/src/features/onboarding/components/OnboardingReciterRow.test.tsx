import { fireEvent } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { OnboardingReciterRow } from './OnboardingReciterRow';

const base = {
  name: 'مشاري راشد العفاسي',
  letter: 'م',
  selected: false,
  styleLabel: 'مرتّل',
  playLabel: 'تشغيل مشاري راشد العفاسي',
  onSelect: () => undefined,
  onPlay: () => undefined,
  testID: 'row',
};

describe('OnboardingReciterRow', () => {
  it.each(locales)('shows the name, the style and the play button (%s)', async (locale) => {
    const view = await renderUi(<OnboardingReciterRow {...base} />, { locale });

    expect(view.getByText('مشاري راشد العفاسي')).toBeOnTheScreen();
    expect(view.getByText('مرتّل')).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'تشغيل مشاري راشد العفاسي' })).toBeOnTheScreen();
  });

  it('draws the buffering ring and the pause glyph while its reciter starts', async () => {
    const view = await renderUi(<OnboardingReciterRow {...base} playLabel="إيقاف مؤقت" starting />);

    expect(view.getByTestId('row-play-buffering', { includeHiddenElements: true })).toBeTruthy();
    expect(view.getByRole('button', { name: 'إيقاف مؤقت' }).props.accessibilityState).toEqual({ busy: true });
  });

  it('draws no buffering ring when its reciter is not starting', async () => {
    const view = await renderUi(<OnboardingReciterRow {...base} />);

    expect(view.queryByTestId('row-play-buffering', { includeHiddenElements: true })).toBeNull();
  });

  it('ignores a second tap on its play button while the reciter starts', async () => {
    const onPlay = jest.fn();
    const view = await renderUi(<OnboardingReciterRow {...base} onPlay={onPlay} playLabel="إيقاف مؤقت" starting />);

    fireEvent.press(view.getByRole('button', { name: 'إيقاف مؤقت' }));

    expect(onPlay).not.toHaveBeenCalled();
  });

  it('calls onPlay from the play button and onSelect from the name area', async () => {
    const onPlay = jest.fn();
    const onSelect = jest.fn();
    const view = await renderUi(<OnboardingReciterRow {...base} onPlay={onPlay} onSelect={onSelect} />);

    fireEvent.press(view.getByRole('button', { name: 'تشغيل مشاري راشد العفاسي' }));
    fireEvent.press(view.getByRole('radio'));

    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/onboarding/components/OnboardingReciterRow.tsx')).toEqual([]);
  });
});
