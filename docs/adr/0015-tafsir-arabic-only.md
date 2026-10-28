# 0015 — Tafsir text is Arabic only

Date: 2026-10-28 · Status: accepted · Amends the content plan (tafsir), spec §7 and §9, step 12 of Phase 2

## Context

QF's tafsir catalogue mixes languages: 20 tafsirs in production (7 Arabic, the rest Urdu, Bengali, English, Russian and Kurdish), 6 in prelive (1 Arabic). The API synced and served all of them, and the device could download any.

## Decision

1. **Only Arabic tafsirs** are synced, packed, listed in the manifest and offered on the device, in every interface language. `config/quran.php` `tafsir_languages = ['arabic']`.
2. Non-Arabic tafsir resources are kept as inactive rows (ids stay stable); their entries, packs and changes are deleted by a migration.
3. Tafsir names show in Arabic (`name_ar`, step 12) in the Arabic interface and in English (`name`) in the English interface. Only the name changes with the interface; the text stays Arabic.
4. Hadith is unaffected (ADR 0014: Arabic always shown, English under it in the English interface).

## Consequences

- Prelive gives one tafsir (Jalalayn). The full set (Muyassar, Ibn Kathir, Tabari, Qurtubi, Sa'di, Baghawi, al-Wasit) needs QF production keys.
- Smaller sync and fewer packs.
