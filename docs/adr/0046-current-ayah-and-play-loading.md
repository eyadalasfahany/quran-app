# 0046 — One current ayah drives the mini player and the reciters list, and play shows loading

Date: 2026-11-02 · Status: accepted (developer, 2 Nov 2026) · Amends ADR 0028 §2 and the idle-bar rule in the mini player; the loading ring (decision 4) lands in a later step.

## Context

The app had two places for "where the user is". The reader kept `reader.lastVerseKey` as the reading place (ADR 0037), and playback wrote the ayah being recited to the same key (ADR 0028 §2). The Home card, the Index row and Khatma already read that key. The mini player did not: an idle bar showed the reader's top ayah only in the reader, a paused bar showed the last-played surah and resumed it, and the tabs and sidebar bars showed nothing until something had loaded.

The reciters list started a reciter at the top of the loaded surah, or surah 1. A reader who had paused on 2:255 and scrolled to 2:260 got surah 2 from its start, or nothing that matched the ayah on screen.

Every play button also gave no feedback between the tap and the first audio. A pack install can take seconds, and the button looked unchanged for all of them.

## Decision

1. **One current ayah.** `reader.lastVerseKey` is the current ayah. While audio plays or loads it is the ayah being recited (ADR 0028 §2). When nothing plays it is the reading place (ADR 0037 §5). Scrolling does not move it while audio plays.
2. **The mini player shows the current ayah whenever nothing plays.** When the player is idle, paused or in error, every variant (`tabs`, `reader`, `sidebar`) shows the current ayah's surah and ayah, with the reciter a play would use. Its button starts that ayah from its beginning with `playVerse`, including when the paused ayah is the same one. While audio plays or loads, the bar shows what is playing and its button pauses. The progress line shows only while audio plays, because it measures the audio that is playing.
3. **The idle bar shows once an ayah is saved.** `tabs` and `sidebar` show while idle once `reader.lastVerseKey` is saved and a reciter resolves. A fresh install with nothing read shows no bar. The `reader` variant keeps its rule (a reciter resolves). Window-class rules are unchanged: tabs and the reader bar stay off the expanded window, and the sidebar footer appears only there.
4. **The reciters list plays from the current ayah.** A reciter's ▶ installs its pack if needed, sets the reciter, and calls `playFromVerse` on the current ayah. A reciter already playing or loading is left as it is. A paused reciter starts the current ayah instead of resuming the surah it stopped in.
5. **Recent listens and a reciter's surah page keep their own start.** Home's "Recently listened" resumes its saved position, and a surah tapped on a reciter's page starts that surah from its beginning. Neither follows the current ayah.
6. **Every play entry records a starting target.** The store's `startingTarget` is set on tap, before any pack install, by `playVerse`, `playReciter`, `playRecentListen` and `playSurahFromReciter`. It is cleared when audio plays, pauses, fails or stops, when an install fails, and when an entry returns without starting. The approved buffering ring reads it from tap to first audio. The ring is built in a later step, not in this change.

## Consequences

- One ayah answers "where am I" on every surface: the Home card, the Index row, Khatma, the mini player and the reciters list.
- A paused bar no longer resumes the surah it stopped in. It starts the current ayah. The full player keeps its own surah and position (the session is restored as paused on a cold start).
- The paused progress line disappears. It showed the position of audio that is no longer the current ayah.
- The reader bar no longer takes the top ayah from the screen as a prop. Its idle caption and its play button both read the current ayah.
- Playback that starts from a tap is visible from the tap to the first sound, once the ring is built.
