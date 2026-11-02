# 0045 — English interface shows transliterated surah names

Date: 2026-11-02 · Status: accepted (developer, 2 Nov 2026) · Changes what the reader title and surah labels show in English (ADR 0014 unaffected).

## Context

The English interface mixed scripts for the same surah. The Home «Continue reading» card read «Surah البقرة», Khatma read «Where I left off · البقرة · ayah 255», and the reader title, ayah panel, player and lock screen showed the English meaning «The Cow». A reader could see «البقرة», "The Cow" and "Al-Baqarah" for one surah in one session.

Most call sites passed `chapter.nameArabic` whatever the locale. Others chose between `nameArabic` and `nameEn` by hand, and some used `nameSimple`. Nothing held one rule.

## Decision

1. **One helper.** `chapterDisplayName(chapter, locale)` in `src/features/reader/data/chapters.ts` returns the surah name the interface shows. Every display site calls it; none picks a column by hand.
2. **English shows `nameSimple`** ("Al-Baqarah"), everywhere a surah name is displayed: the reader title, the place line, the ayah and tafsir panel header, the player, the lock screen, the verse caption, Home, Khatma, Library, My Quran, Search, the menu, recent listens and reciter downloads.
3. **Arabic shows `nameArabic`** in the same places.
4. **`nameEn` is no longer displayed.** It stays in the content database and still feeds English search matching (`src/features/search/surahMatch.ts`), so typing "cow" still finds Al-Baqarah.
5. **Mushaf-page ornaments stay Arabic in both languages.** The surah header cartouche on the page and the mushaf page slots are part of the printed page, so they keep `nameArabic`. The surah index row (`SurahRow`) is unchanged.

## Consequences

- An English user sees one name per surah in every screen: «Al-Baqarah», never «The Cow» or «البقرة».
- No stored text changes. The names are displayed as they are stored in the chapter table; nothing is re-encoded or edited.
- Any new surah-name display goes through `chapterDisplayName`. A review should reject a direct `nameArabic` or `nameEn` in a component.
- English users who knew the meaning «The Cow» lose it in the reader. The meaning is still searchable.
