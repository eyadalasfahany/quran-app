import { act, fireEvent } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';

import { themes } from '@/core/theme';
import { pause } from '@/features/audio/player';
import { usePlayerStore } from '@/features/audio/playerStore';
import { getHighlights, listBookmarks } from '@/features/library/data';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { openUserTestStore } from '../../../../jest/user-test-db';
import { AyahActionsPanel } from './AyahActionsPanel';

jest.mock('expo-crypto', () => ({ randomUUID: () => globalThis.crypto.randomUUID() }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));
jest.mock('@/features/audio/player', () => ({
  ...jest.requireActual<typeof import('@/features/audio/player')>('@/features/audio/player'),
  pause: jest.fn(),
}));

const AYAH_1_2 = 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ';
const REFERENCE = 'الفاتحة · الآية ٢';

// The seven action tiles, in the order the ayah sheet shows them (ADR 0014).
const TILE_KEYS = ['play', 'tafsir', 'bookmark', 'repeat', 'note', 'copy', 'share'] as const;

function panel(overrides: Partial<Parameters<typeof AyahActionsPanel>[0]> = {}) {
  return (
    <AyahActionsPanel
      bookmarked={false}
      highlight={null}
      note={null}
      reference={REFERENCE}
      textUthmani={AYAH_1_2}
      verseId={2}
      verseNumber={2}
      {...overrides}
    />
  );
}

describe('AyahActionsPanel', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the highlight row and the actions grid, with play primary', async () => {
    const view = await renderUi(panel());

    expect(view.getAllByRole('button', { name: /تظليل/ })).toHaveLength(4);
    expect(view.getByRole('button', { name: 'تشغيل من هنا' })).toBeOnTheScreen();
    for (const label of ['حفظ', 'تكرار', 'ملاحظة', 'نسخ', 'مشاركة']) {
      expect(view.getByRole('button', { name: label })).toBeOnTheScreen();
    }
  });

  it('shows exactly seven tiles in order, with no translation tile and no word chips', async () => {
    const view = await renderUi(panel({ onOpenTafsir: jest.fn() }), { locale: 'en' });

    const tileIds = TILE_KEYS.map((key) => `ayah-actions-panel-${key}`);
    const shownTileIds = view
      .getAllByRole('button')
      .map((button) => button.props.testID as string | undefined)
      .filter((id): id is string => id !== undefined && tileIds.includes(id));

    expect(shownTileIds).toEqual(tileIds);
    expect(view.queryByTestId('ayah-actions-panel-translation')).toBeNull();
    expect(view.queryByRole('button', { name: 'Translation' })).toBeNull();
    expect(view.queryByTestId('ayah-actions-panel-words')).toBeNull();
  });

  it('keeps play and repeat disabled with a hint while audio is unavailable', async () => {
    const view = await renderUi(panel(), { locale: 'en' });

    for (const name of ['Play from here', 'Repeat']) {
      const tile = view.getByRole('button', { name });
      expect(tile.props.accessibilityState).toMatchObject({ disabled: true });
      expect(tile.props.accessibilityHint).toBe("Recitation isn't available yet");
    }
  });

  it('toggles the bookmark through the user.db repository', async () => {
    const { store } = openUserTestStore();
    const view = await renderUi(panel({ store }), { locale: 'en' });

    await fireEvent.press(view.getByRole('button', { name: 'Bookmark' }));
    expect(listBookmarks(store).map((bookmark) => [bookmark.verseId, bookmark.kind])).toEqual([[2, 'verse']]);
    expect(view.getByRole('button', { name: 'Bookmarked' }).props.accessibilityState).toMatchObject({ selected: true });

    await fireEvent.press(view.getByRole('button', { name: 'Bookmarked' }));
    expect(listBookmarks(store)).toEqual([]);
    expect(view.getByRole('button', { name: 'Bookmark' }).props.accessibilityState).toMatchObject({ selected: false });
  });

  it('sets a highlight colour and clears it when chosen again', async () => {
    const { store } = openUserTestStore();
    const view = await renderUi(panel({ store }), { locale: 'en' });

    await fireEvent.press(view.getByRole('button', { name: 'Green highlight' }));
    expect(getHighlights([2], store).map((highlight) => highlight.color)).toEqual(['green']);
    expect(view.getByRole('button', { name: 'Green highlight' }).props.accessibilityState).toEqual({ selected: true });

    await fireEvent.press(view.getByRole('button', { name: 'Blue highlight' }));
    expect(getHighlights([2], store).map((highlight) => highlight.color)).toEqual(['blue']);

    await fireEvent.press(view.getByRole('button', { name: 'Blue highlight' }));
    expect(getHighlights([2], store)).toEqual([]);
    expect(view.getByRole('button', { name: 'Blue highlight' }).props.accessibilityState).toEqual({ selected: false });
  });

  it('copies the exact ayah bytes with its marker and reference', async () => {
    const view = await renderUi(panel(), { locale: 'en' });

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: 'Copy' }));
    });

    const expected = `${AYAH_1_2} ﴿٢﴾\n${REFERENCE}`;
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith(expected);
    const copied = jest.mocked(Clipboard.setStringAsync).mock.calls[0]?.[0] ?? '';
    const encoder = new TextEncoder();
    expect([...encoder.encode(copied)]).toEqual([...encoder.encode(expected)]);
    expect(view.getByTestId('ayah-actions-panel-copied')).toHaveTextContent('Ayah copied');
    expect(flatStyle(view.getByTestId('ayah-actions-panel-copied').props.style)).toMatchObject({
      color: themes.light.colors.inkMuted,
      textAlign: 'center',
    });
  });

  it('shares the same text through the native share sheet', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction, activityType: undefined });
    const view = await renderUi(panel(), { locale: 'en' });

    await fireEvent.press(view.getByRole('button', { name: 'Share' }));

    expect(share).toHaveBeenCalledWith({ message: `${AYAH_1_2} ﴿٢﴾\n${REFERENCE}` });
  });

  it('opens the note editor from the note tile', async () => {
    const { store } = openUserTestStore();
    const view = await renderUi(panel({ store }), { locale: 'en' });

    expect(view.queryByTestId('ayah-actions-panel-note-editor')).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: 'Note' }));
    expect(view.getByTestId('ayah-actions-panel-note-editor')).toBeOnTheScreen();
  });

  it('shows the tafsir tile only when it can open', async () => {
    const onOpenTafsir = jest.fn();
    const withTafsir = await renderUi(panel({ onOpenTafsir }), { locale: 'en' });

    await fireEvent.press(withTafsir.getByRole('button', { name: 'Tafsir' }));
    expect(onOpenTafsir).toHaveBeenCalledTimes(1);

    const withoutTafsir = await renderUi(panel(), { locale: 'en' });
    expect(withoutTafsir.queryByRole('button', { name: 'Tafsir' })).toBeNull();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/panels/AyahActionsPanel.tsx')).toEqual([]);
  });
});

describe('AyahActionsPanel play while recited', () => {
  afterEach(() => {
    usePlayerStore.getState().reset();
    jest.mocked(pause).mockClear();
  });

  it('shows pause on the play tile while this ayah is recited, and pauses from it', async () => {
    // verseId 2 is the panel's ayah (panel() below).
    usePlayerStore.setState({ activeVerseId: 2, status: 'playing' });
    const view = await renderUi(panel());

    fireEvent.press(view.getByRole('button', { name: 'إيقاف مؤقت' }));

    expect(pause).toHaveBeenCalledTimes(1);
  });

  it('keeps the play label while another ayah is recited', async () => {
    usePlayerStore.setState({ activeVerseId: 3, status: 'playing' });
    const view = await renderUi(panel());

    expect(view.queryByRole('button', { name: 'إيقاف مؤقت' })).toBeNull();
  });
});
