# Prompt 14 — ADR renumbering (docs only; run first)

Monorepo `D:\projects\quran-app`. Follow @docs/plans/cursor/README.md. Docs and comments only: no behaviour change, no test changes beyond comment text.

**Why the numbers changed (blocked on the developer until confirmed):** the brief said 0042-features → 0044 and 0043-names → 0045. The merge of origin/main at `8d982cd` committed **`docs/adr/0044-packs-build-at-web-start.md`**, so 0044 is taken. `0046-duas.md` stays. **Proposed:**

| Old (untracked) | New |
| --- | --- |
| `docs/adr/0042-features-enabled-by-default.md` | `docs/adr/0045-features-enabled-by-default.md` |
| `docs/adr/0043-names-hijri-moon.md` | `docs/adr/0047-names-hijri-moon.md` |

If the developer picks other numbers, substitute them throughout. The committed `0042-hadith-collections-source.md`, `0043-interface-text-follows-window-size.md` and `0044-packs-build-at-web-start.md`, and every committed reference to them, **must not change**.

**Steps:**
1. `git mv` can't be used (the files are untracked), so rename them with a plain move. Change each H1 (`# 0042 —` → `# 0045 —`, `# 0043 —` → `# 0047 —`). Delete 0043's "Numbering note" paragraph (line 5) and the "Numbering" bullet in `docs/plans/names-hijri-moon.md:267`. Add both to the table in `docs/adr/README.md`, if it has one.
2. Rewrite references **only on lines that are uncommitted**. Find them with:
   ```bash
   git diff -U0 HEAD | awk '/^\+\+\+ b\//{f=substr($0,7)} /^@@/{match($0,/\+[0-9]+/);n=substr($0,RSTART+1,RLENGTH-1)-1} /^\+[^+]/{n++; if($0~/004[2345]/)print f":"n} /^ /{n++}'
   git ls-files --others --exclude-standard | xargs grep -nE "004[2345]"
   ```
3. Mapping rules for those lines:
   - "ADR 0042" meaning features enabled by default / no switches → **0045**. `0042-features-enabled-by-default` → `0045-features-enabled-by-default`.
   - "ADR 0044" meaning features enabled by default → **0045**. These were written assuming the old plan: `CLAUDE.md:68` (second ref, "no environment switch"); `docs/content-plan.md:143` (second), `:146`, `:189`, `:190` (second); `docs/adr/0046-duas.md:5, 23, 24, 49, 91, 108, 150` and its "Developer decisions" line about decision 20; `docs/plans/duas.md:7, 213, 219, 222` (second).
   - "ADR 0043" meaning Names/Hijri/moon → **0047**: `docs/content-plan.md:51, 165, 168`; `docs/technical-spec.md:845`; `docs/plans/names-hijri-moon.md:5, 18, 28, 37, 73, 143, 170, 217, 245`; the HTML markers `<!--ADR0043-->` / `<!--/ADR0043-->` and every "ADR 0043" between them in `quran-app-screens.html` (around lines 5924-6134).
   - "ADR 0045" meaning Names/Hijri/moon → **0047**: `docs/adr/0046-duas.md:5, 116`; `docs/plans/duas.md:160` (two), `:221`.
   - **Keep as 0042 (hadith):** `CLAUDE.md:68` (first, `ft/hadith`); `quran-app-screens.html:3432`; `docs/content-plan.md:143` (first, "Deferred"), `:190` (first, "deferred for hadith"); `docs/adr/0046-duas.md:62, 65, 67, 70, 140, 149`; `docs/plans/duas.md:99, 222` (first); `0042-hadith-collections-source` and `0042-hadith` wherever they appear.
   - **Keep as 0044 (packs build at web start, upstream):** `ImportAzkarCommand.php:33`, `AzkarImporter.php:60` and any line that talks about pre-deploy, `--defer-pack` or packs at web start.
   - **Keep as 0043 (interface text, upstream):** `src/shared/ui/UiText.tsx` and any line about the text scale.
   - Every other uncommitted "ADR 0042" about switches, provenance, snapshots or fixtures → 0045. These are in: `apps/api/.env.example:65`, `AzkarImporter.php:32,410,425`, `AzkarTransformer.php:144`, `DorarConfig.php:34`, `config/azkar.php:30,44`, `config/services.php:33`, `docker/release.sh:10`, `AzkarAudioService.php:15`, migration `2026_11_01_100016…:9,17`, tests `AzkarImportTest.php:38,179`, `HadeethEncTest.php:171`, `DorarBindingTest.php:27`, `AzkarImportFingerprintTest.php:29`, `PermissionStatusIsProvenanceTest.php:17`, mobile `azkar/data/__fixtures__/dev-fixtures.ts:7`, `widgets/android/AzkarWidget.tsx:51`, `widgets/snapshot/types.ts:69`, docs `adr/0031-azkar.md:3,26,111,124,163,164`, `adr/0038-…md:3,33,35,41,45,46`, `adr/0040-…md:40`, `content-plan.md:152,153,171`, `plans/phase-6/README.md:31`, `step-05-mobile-data.md:77,80`, `step-14-audio-and-storage.md:267,278`, `runbooks/railway-release.md:3,52,56,77,78,126,147`, `technical-spec.md:429`, and the new 0045 file's own line 85.
4. In `0046-duas.md:5`, rewrite the numbering sentence: "ADR 0045 (features enabled by default) and ADR 0047 (99 Names, Hijri, moon) are other planners' files. ADR 0042 (hadith collections), 0043 (interface text) and 0044 (packs build at web start) are on origin/main."
5. Also update the memory note's ADR number only if the developer asks; it lives outside the repo.

**Acceptance:**
- `ls docs/adr` has one file per number from 0042 to 0047, except 0042, which has only the hadith file.
- `git diff HEAD -- docs/adr/0042-hadith-collections-source.md docs/adr/0043-interface-text-follows-window-size.md docs/adr/0044-packs-build-at-web-start.md` is empty.
- No uncommitted line still says "0044" for features or "0043"/"0045" for Names: re-run step 2's commands and check each hit against the rules.
- No committed line changed apart from those listed.

**Gates:** none run code, but run `npx jest __tests__` (mobile) and `php vendor/bin/pest --filter=Deploy` (API) to confirm the comment edits broke nothing.
