import { screen } from '@testing-library/react-native';

import { makeItem, textSegment } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { AzkarStepNote, stepText } from './AzkarStepNote';

const instruction = makeItem({
  id: 6,
  kind: 'instruction',
  requiredCount: null,
  segments: [textSegment('تعليمات تجريبية ١ — ليست ذكرًا')],
  textEn: 'FIXTURE instruction 1 — not a dhikr',
});

describe('AzkarStepNote', () => {
  it('renders the Arabic text of each step in muted subhead type', async () => {
    await renderUi(<AzkarStepNote items={[instruction]} />);
    expect(screen.getByText('تعليمات تجريبية ١ — ليست ذكرًا')).toBeTruthy();
    expect(screen.queryByText('FIXTURE instruction 1 — not a dhikr')).toBeNull();
  });

  it('adds the English line of a step in the English interface', async () => {
    await renderUi(<AzkarStepNote items={[instruction]} />, { locale: 'en' });
    expect(screen.getByText('تعليمات تجريبية ١ — ليست ذكرًا')).toBeTruthy();
    expect(screen.getByText('FIXTURE instruction 1 — not a dhikr')).toBeTruthy();
  });

  it('shows the repeat-group header with Arabic-Indic digits', async () => {
    await renderUi(<AzkarStepNote items={[]} repeatCount={3} />);
    expect(screen.getByTestId('azkar-step-note-repeat').props.children).toBe('تُكرَّر هذه المجموعة ٣ مرات');
  });

  it('shows the repeat header in English with Western digits', async () => {
    await renderUi(<AzkarStepNote items={[]} repeatCount={3} />, { locale: 'en' });
    expect(screen.getByText('This group is repeated 3 times')).toBeTruthy();
  });

  it('renders nothing without steps or a repeat count', async () => {
    await renderUi(<AzkarStepNote items={[]} />);
    expect(screen.queryByTestId('azkar-step-note')).toBeNull();
  });

  it('reads plain segments only, skipping Quran and empty text', () => {
    expect(stepText(makeItem({ segments: [textSegment('أ'), textSegment(null, 2), textSegment('  ')] }))).toBe('أ');
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarStepNote.tsx')).toEqual([]);
  });
});
