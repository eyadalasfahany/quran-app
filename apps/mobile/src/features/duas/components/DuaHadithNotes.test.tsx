import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { DuaHadithNotes } from './DuaHadithNotes';

// Fixture text only: no dua, meaning or benefit is written here.
const EXPLANATION = 'FIXTURE explanation — not a dua';
const HINTS = 'FIXTURE hint 1 — not a dua\n\nFIXTURE hint 2 — not a dua';

describe('DuaHadithNotes', () => {
  it('renders the meaning and the benefits under their headings', async () => {
    await renderUi(<DuaHadithNotes explanation={EXPLANATION} hints={HINTS} />);

    expect(screen.getByText('المعنى')).toBeOnTheScreen();
    expect(screen.getByText(EXPLANATION)).toBeOnTheScreen();
    expect(screen.getByText('الفوائد')).toBeOnTheScreen();
    expect(screen.getByText(HINTS)).toBeOnTheScreen();
  });

  it('draws a hairline above the block and one between the two sections', async () => {
    await renderUi(<DuaHadithNotes explanation={EXPLANATION} hints={HINTS} />);

    // One hairline above, one between the sections: two dividers in all.
    expect(screen.getAllByTestId('dua-notes-divider', { includeHiddenElements: true })).toHaveLength(2);
  });

  it('shows only the section that has text, with no divider between', async () => {
    await renderUi(<DuaHadithNotes explanation={EXPLANATION} hints={null} />);

    expect(screen.getByText('المعنى')).toBeOnTheScreen();
    expect(screen.queryByText('الفوائد')).toBeNull();
    expect(screen.getAllByTestId('dua-notes-divider', { includeHiddenElements: true })).toHaveLength(1);
  });

  it('treats a blank field as empty', async () => {
    await renderUi(<DuaHadithNotes explanation="   " hints={HINTS} />);

    expect(screen.queryByText('المعنى')).toBeNull();
    expect(screen.getByText('الفوائد')).toBeOnTheScreen();
  });

  it('renders nothing when both fields are empty', async () => {
    await renderUi(<DuaHadithNotes explanation={null} hints={null} />);

    expect(screen.queryByTestId('dua-hadith-notes')).toBeNull();
  });

  it('renders the English headings', async () => {
    await renderUi(<DuaHadithNotes explanation={EXPLANATION} hints={HINTS} />, { locale: 'en' });

    expect(screen.getByText('Meaning')).toBeOnTheScreen();
    expect(screen.getByText('Lessons')).toBeOnTheScreen();
  });
});
