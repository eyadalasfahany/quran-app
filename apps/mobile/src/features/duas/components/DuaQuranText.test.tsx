import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { renderUi } from '../../../../jest/render-ui';
import { themes } from '@/core/theme';
import { ORNATE_CLOSE, ORNATE_OPEN } from '@/shared/ui';

import { DuaQuranText, type DuaQuranVerse } from './DuaQuranText';

// Placeholder verses, not Quran text. The trailing space and the marks check that nothing is trimmed or re-encoded.
const VERSES: DuaQuranVerse[] = [
  { id: 101, textUthmani: 'نص تجريبي ١ — ليس ذكرًا ' },
  { id: 102, textUthmani: 'نَصّ تجريبي ٢ — ليس ذكرًا' },
  { id: 103, textUthmani: 'FIXTURE VERSE 3 — not a dua' },
];

/** Every string under a rendered node, in order: what a reader would see joined. */
function textOf(node: unknown): string {
  if (typeof node === 'string') {
    return node;
  }
  if (Array.isArray(node)) {
    return node.map(textOf).join('');
  }
  if (node !== null && typeof node === 'object' && 'children' in node) {
    return textOf((node as { children: unknown }).children);
  }
  return '';
}

const joined = VERSES.map((verse) => verse.textUthmani).join(' ');

describe('DuaQuranText', () => {
  it('renders the joined verse text in the Quran face', async () => {
    await renderUi(<DuaQuranText verses={VERSES} />);
    expect(screen.getByTestId('dua-quran-text')).toBeOnTheScreen();
  });

  it('renders byte-identical text to the verses joined by one space, inside the ornate brackets', async () => {
    const view = await renderUi(<DuaQuranText verses={VERSES} />);

    expect(textOf(view.toJSON())).toBe(`${ORNATE_OPEN}${joined}${ORNATE_CLOSE}`);
  });

  it('keeps the text byte-identical while a verse is highlighted', async () => {
    const view = await renderUi(<DuaQuranText activeVerseId={102} verses={VERSES} />);

    expect(textOf(view.toJSON())).toBe(`${ORNATE_OPEN}${joined}${ORNATE_CLOSE}`);
  });

  it('gives the verse being recited the active-ayah wash, and no other verse one', async () => {
    await renderUi(<DuaQuranText activeVerseId={102} verses={VERSES} />);

    const active = StyleSheet.flatten(screen.getByText(VERSES[1]!.textUthmani).props.style);
    const other = StyleSheet.flatten(screen.getByText(VERSES[0]!.textUthmani).props.style);

    expect(active?.backgroundColor).toBe(themes.light.colors.highlightActive);
    expect(other?.backgroundColor).toBeUndefined();
  });

  it('highlights nothing when no verse is being recited', async () => {
    await renderUi(<DuaQuranText verses={VERSES} />);

    for (const verse of VERSES) {
      expect(StyleSheet.flatten(screen.getByText(verse.textUthmani).props.style)?.backgroundColor).toBeUndefined();
    }
  });

  it('renders nothing when the verses are empty', async () => {
    await renderUi(<DuaQuranText verses={[]} />);
    expect(screen.queryByTestId('dua-quran-text')).toBeNull();
  });
});
