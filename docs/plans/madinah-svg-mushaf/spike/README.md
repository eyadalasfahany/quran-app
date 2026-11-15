# quran-svg word-box spike (ADR 0090)

Throwaway scripts from 12 Nov 2026, kept for plan step 3 to port. Not production code.

- `words2.py`: contour bboxes from a page's text path; v2 gap split with Tanzil word counts per ayah.
- `words3.py`: v3, per-line word counts from the 1441H layout; gap split per line.
- `words4.py`: v4, each line's contours in path order split into N groups by a dynamic program (the method ADR 0090 adopts).

Inputs (never committed): quran-svg v1.1.1 Hafs pages (`NNN.svg`, `NNN.json`) from the CDN, and `NNN-layout.json` exported from the local `word_layouts` table (QF data, stays on the Mac). Run from this folder: `python3 -I -c "import sys; sys.argv=['w','<data_dir>','300']; import words4; words4.main()"`.
- `words5.py`: v5, every group must hold a full-height contour (no mark-only "words").
- `words6.py`: v6, check that each box centre lies in its own ayah's span; words of a line ordered by (verse, position in verse).
- `words7.py`: v7, **the adopted method**: the v5 split with the ayah span as a constraint inside the dynamic program. 2 of 452 words broke W2 on pages 3, 50, 300 and 604.
