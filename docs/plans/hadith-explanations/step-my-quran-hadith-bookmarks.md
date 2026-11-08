# Brief: Quran and Hadith bookmarks in My Quran (مصحفي)

Developer, 8 Nov 2026: "for bookmarks, add new tabs in my profile screen so I can have surah bookmarked or hadith, without a html, do it on app". No new frame: reuse existing components and tokens. Mobile only (`apps/mobile`).

## What to build

In `src/features/my-quran/screens/MyQuranScreen.tsx`, the «العلامات» (`bookmarks`) tab gets a row of two small white chips under the main `MyQuranTabs` (developer: styled like the highlight colour filter chips, not a segmented control): «القرآن» / «الحديث» (en: "Quran" / "Hadith"). Default `quran`. Only shown while the bookmarks tab is active. The choice is plain `useState` (not persisted).

- `quran`: today's `<BookmarkListCard …/>`, unchanged.
- `hadith`: the saved hadith list, exactly what `src/features/hadith/screens/HadithSavedScreen.tsx` shows today (the `UnverifiedNotice` when any item is unverified, then one `SavedHadithRow` per item, newest first; `HadithStateView kind="savedEmpty"` when there are none). Pressing a row pushes `savedItemHref(item)`. The empty state's action pushes `hadithHref.home` (`router.push`, not replace, since we are in a tab).

## Files

1. **New** `src/features/my-quran/components/BookmarkKindTabs.tsx` (+ `BookmarkKindTabs.test.tsx`): two `Chip`s (`@/shared/ui`, `role="radio"`) in a wrapping row, modelled exactly on `HighlightFilterChips.tsx`. `export type BookmarkKind = 'quran' | 'hadith'`. Props `value`, `onChange`, `testID = 'my-quran-bookmark-kinds'`. Label `t('myQuran.bookmarkKindsLabel')`, options `t('myQuran.bookmarkKinds.quran')`, `t('myQuran.bookmarkKinds.hadith')`. Test like `MyQuranTabs.test.tsx`: both labels in ar and en, press calls `onChange('hadith')`, role `radio`.
2. **New** `src/features/hadith/components/SavedHadithList.tsx` (+ test): move the list/empty-state block out of `HadithSavedScreen` into this component. Props: `onOpen: (item) => void`, `onEmptyAction: () => void`, `testID`. It calls `useSavedHadithItems()` itself and renders the notice + rows (inside a `View` with `gap: theme.space[3]`, NOT its own ScrollView — the caller scrolls) or the empty state. Keep the existing testIDs pattern: `${testID}-notice`, `${testID}-row-${index}`, `${testID}-empty`.
   - Then make `HadithSavedScreen` use it inside its existing `ScrollView` (keep `contentContainerStyle={{ gap: theme.space[3], paddingBottom: theme.space[8] }}`), passing `testID={testID}` so the screen's existing testIDs (`screen-hadith-saved-row-0`, `-notice`, `-empty`) stay the same and `HadithSavedScreen.test.tsx` keeps passing unchanged. If the empty state looked different before because it was not inside a ScrollView, keep it outside the ScrollView when empty (render the ScrollView only when there are items — check `useSavedHadithItems().length` in the screen, or give the component an `items` prop; pick whichever keeps the screen test unchanged).
   - Test: rows render with placeholder data (mock `../personal` `useSavedHadithItems` the way `HadithSavedScreen.test.tsx` does), notice shown only when an item is unverified, empty state + its action, row press calls `onOpen`, ar and en, accessibility (rows are buttons).
3. **Edit** `MyQuranScreen.tsx`: add `const [bookmarkKind, setBookmarkKind] = useState<BookmarkKind>('quran')`; when `activeTab === 'bookmarks'` render `<BookmarkKindTabs …/>` then either the `BookmarkListCard` or `<SavedHadithList onOpen={(item) => router.push(savedItemHref(item))} onEmptyAction={() => router.push(hadithHref.home)} testID="my-quran-saved-hadith" />`. Put `BookmarkKindTabs` inside the ScrollView as its first child (only on the bookmarks tab). Imports from `@/features/hadith/...` are fine (the screen already imports from khatma and library).
4. **i18n** `src/core/i18n/locales/ar.json` and `en.json`, under the top-level `"myQuran"` object (line ~389 in ar, where `tabsLabel` is): `"bookmarkKindsLabel": "نوع العلامات"` / `"Bookmark type"`, `"bookmarkKinds": { "quran": "القرآن", "hadith": "الحديث" }` / `{ "quran": "Quran", "hadith": "Hadith" }`. Check the i18n key-parity test passes.
5. **Tests** `MyQuranScreen.test.tsx`: add cases — the kind tabs show on the bookmarks tab only; default Quran shows the bookmark card; pressing «الحديث» shows the saved hadith list (mock `useSavedHadithItems` with one placeholder item and assert `my-quran-saved-hadith-row-0`), pressing it calls `router.push`.

## Rules

- Placeholder text only in fixtures («نص تجريبي»), never real hadith text.
- Tokens via `useTheme()`, no raw hex, no `left`/`right` style props (use start/end). i18n keys only.
- No new dependency. Don't touch `apps/api`, `screens/`, `tools/`, `CLAUDE.md`. Don't commit.

## Gates (from `apps/mobile`)

`npm run lint && npx tsc --noEmit && npm test` — all must pass (a jest worker SIGSEGV is a flake: rerun that file). Report the files changed, test counts and any deviation with the reason.
