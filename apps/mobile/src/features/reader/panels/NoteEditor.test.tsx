import { fireEvent } from '@testing-library/react-native';

import { themes } from '@/core/theme';
import { getNotes, NOTE_MAX_CHARACTERS, saveNote } from '@/features/library/data';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { openUserTestStore } from '../../../../jest/user-test-db';
import { SheetContext, type SheetContextValue } from '../components/sheet-context';
import { NoteEditor } from './NoteEditor';

jest.mock('expo-crypto', () => ({ randomUUID: () => globalThis.crypto.randomUUID() }));

describe('NoteEditor', () => {
  it('renders an empty field with the counter and a disabled save', async () => {
    const { store } = openUserTestStore();
    const view = await renderUi(<NoteEditor note={null} store={store} verseId={2} />);

    expect(view.getByLabelText('ملاحظة على الآية').props.multiline).toBe(true);
    expect(view.getByTestId('note-editor-counter')).toHaveTextContent('٠ / ١٠٠٠٠');
    expect(view.getByRole('button', { name: 'حفظ الملاحظة' }).props.accessibilityState).toEqual({ disabled: true });
    expect(view.queryByRole('button', { name: 'حذف الملاحظة' })).toBeNull();
  });

  it('expands the sheet to full when the field takes focus, for the keyboard', async () => {
    const { store } = openUserTestStore();
    const expand = jest.fn();
    const sheet = {
      close: jest.fn(),
      collapse: jest.fn(),
      detent: 'mid',
      expand,
      panGesture: {},
      scrollOffset: { value: 0 },
    } as unknown as SheetContextValue;
    const view = await renderUi(
      <SheetContext.Provider value={sheet}>
        <NoteEditor note={null} store={store} verseId={2} />
      </SheetContext.Provider>,
      { locale: 'en' },
    );

    fireEvent(view.getByLabelText('Note on this ayah'), 'focus');

    expect(expand).toHaveBeenCalledTimes(1);
  });

  it('saves a new note through the repository', async () => {
    const { store } = openUserTestStore();
    const onDone = jest.fn();
    const view = await renderUi(<NoteEditor note={null} onDone={onDone} store={store} verseId={2} />, { locale: 'en' });

    await fireEvent.changeText(view.getByLabelText('Note on this ayah'), 'Reflect on gratitude');
    await fireEvent.press(view.getByRole('button', { name: 'Save note' }));

    expect(getNotes(2, store).map((note) => note.body)).toEqual(['Reflect on gratitude']);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('replaces the edited note and deletes it', async () => {
    const { store } = openUserTestStore();
    const existing = saveNote(2, 'old', store);
    const view = await renderUi(<NoteEditor note={existing} store={store} verseId={2} />, { locale: 'en' });

    await fireEvent.changeText(view.getByLabelText('Note on this ayah'), 'new');
    await fireEvent.press(view.getByRole('button', { name: 'Save note' }));
    expect(getNotes(2, store).map((note) => note.body)).toEqual(['new']);
    await view.unmount();

    const [current] = getNotes(2, store);
    const again = await renderUi(<NoteEditor note={current ?? null} store={store} verseId={2} />, { locale: 'en' });
    await fireEvent.press(again.getByRole('button', { name: 'Delete note' }));
    expect(getNotes(2, store)).toEqual([]);
  });

  it('enforces the 10,000-character limit', async () => {
    const { store } = openUserTestStore();
    const view = await renderUi(<NoteEditor note={null} store={store} verseId={2} />, { locale: 'en' });
    const input = view.getByLabelText('Note on this ayah');

    await fireEvent.changeText(input, 'ب'.repeat(NOTE_MAX_CHARACTERS));
    expect(view.getByTestId('note-editor-counter')).toHaveTextContent('10000 / 10000');
    expect(view.getByRole('button', { name: 'Save note' }).props.accessibilityState).toEqual({ disabled: false });

    await fireEvent.changeText(input, 'ب'.repeat(NOTE_MAX_CHARACTERS + 1));
    expect(view.getByTestId('note-editor-counter')).toHaveTextContent('Notes can be up to 10000 characters');
    const save = view.getByRole('button', { name: 'Save note' });
    expect(save.props.accessibilityState).toEqual({ disabled: true });

    await fireEvent.press(save);
    expect(getNotes(2, store)).toEqual([]);
  });

  it('draws the field in a raised card that turns red past the limit', async () => {
    const { store } = openUserTestStore();
    const view = await renderUi(<NoteEditor note={null} store={store} verseId={2} />, { locale: 'en' });

    expect(flatStyle(view.getByTestId('note-editor-box').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.surfaceRaised,
      borderColor: themes.light.colors.line,
      borderRadius: themes.light.radius.md,
    });
    expect(flatStyle(view.getByTestId('note-editor-counter').props.style).color).toBe(themes.light.colors.inkMuted);

    await fireEvent.changeText(view.getByLabelText('Note on this ayah'), 'ب'.repeat(NOTE_MAX_CHARACTERS + 1));
    expect(flatStyle(view.getByTestId('note-editor-box').props.style).borderColor).toBe(themes.light.colors.danger);
    expect(flatStyle(view.getByTestId('note-editor-counter').props.style).color).toBe(themes.light.colors.danger);
  });

  it('cancels through onDone', async () => {
    const { store } = openUserTestStore();
    const onDone = jest.fn();
    const view = await renderUi(<NoteEditor note={null} onDone={onDone} store={store} verseId={2} />, { locale: 'en' });

    await fireEvent.press(view.getByRole('button', { name: 'Cancel' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('follows the typed text direction, not the interface, in %s', async (locale) => {
    const { store } = openUserTestStore();
    const view = await renderUi(<NoteEditor note={null} store={store} verseId={2} />, { locale });
    const input = view.getByTestId('note-editor-input');

    await fireEvent.changeText(input, 'A note in English');
    expect(flatStyle(view.getByTestId('note-editor-input').props.style)).toMatchObject({
      textAlign: 'auto',
      writingDirection: 'ltr',
    });

    await fireEvent.changeText(input, 'ملاحظة بالعربية');
    expect(flatStyle(view.getByTestId('note-editor-input').props.style)).toMatchObject({
      textAlign: 'auto',
      writingDirection: 'rtl',
    });
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/panels/NoteEditor.tsx')).toEqual([]);
  });
});
