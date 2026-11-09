"""Quality mode (ADR 0077, plan way2quran-quality Q1): the version, the gate parameters and two digests.

- `QUALITY_VERSION` and `PARAMS` hold every threshold in the plan's Gates table. Changing any value bumps
  `QUALITY_VERSION`.
- `params_digest()` fingerprints `PARAMS`. `code_digest()` fingerprints the quality-path sources (P17).
  A calibration record (A6(a)) and a released report carry both, so a report can be traced to the
  parameters and the code it was calibrated on.
"""

import hashlib
import json
from pathlib import Path

from . import __version__

QUALITY_VERSION = "q9"  # q9 (Q10): G2's unsure last word nulls the last ayah when the audio ends on its words
# q8 (Q7g, Q7h): repeats written as positions again, word starts moved 80 ms earlier
# q7 (Q7g): the CTC repeat proposer, the G3 near-tie, Al-Fatiha's opening, G5 sets repeats aside

PARAMS: dict = {
    # G0 completeness
    "KEY_PASS": 80,
    "KEY_UNIQUE": 75,
    "KEY_WORDS": tuple(range(6, 25, 2)),
    "HEAD_CAP_S": 120,
    "TAIL_CAP_S": 300,
    "SOUND_DB": -40,
    "DURATION_FLAG": 0.7,
    # middle gap. PACE_BREAK was (0.5, 2.0); the spliced-018 experiment (Q6a) showed the splice at 1.93 x the median
    # pace, against at most 1.35 x on the unspliced 005, 015, 017, 018 and 055, so the upper bound is 1.6.
    "PACE_BREAK": (0.5, 1.6),
    "ADJ_JUMP": 2.0,
    "GAP_G3_RUN": 3,
    # anchors
    "ASR_EVERY": 4,
    "CUT_SPACING_S": 240,
    "SCORE_NEAR": 72,
    "SCORE_FAR": 85,
    "BACK_WORDS": 3,
    "PACE": (0.3, 3.5),
    "EDGE_WORDS": 2,
    "EDGE_S": 1.5,
    "MIN_CONF": 0.55,
    "CUT_BACK_FRAMES": 2,
    "MIN_CP_PER_S": 1 / 600,
    # Q7c: a slow pace break whose unplaced windows hear at least this share of the passage's own words is a flag
    # (`slow`), not the fail-safe (1/009: 20 of 20 and 17 of 28 words at 3030 s and 3390 s)
    "SLOW_WORDS": 0.6,
    # G2
    "TAIL_MAX_S": 60,
    # G3
    "G3_PRE_S": 0.3,
    "G3_POST_S": 4.5,
    "G3_SCORE": 75,
    "G3_REPROBE": (0.0, 0.6),
    "G3_NEXT_WORDS": 8,
    "G3_CUT_AVOID_S": 3,
    # Q7g: a near-tie between ayahs that open with the same G3_TIE_WORDS words counts as a tie (QF Afasy 2:150 and
    # 2:232 were BAD at 99 and 98 against the identical opening of the ayah before)
    "G3_TIE_DELTA": 2,
    "G3_TIE_WORDS": 3,
    # Q7d: a G3 clip holds about G3_MIN_WORDS words at the surah's pace (seconds per word inside ayahs), at least
    # G3_PRE_S + G3_POST_S and at most G3_MAX_S, so a slow reciter's clip is not one or two words long.
    "G3_MIN_WORDS": 5,
    "G3_MAX_S": 12.0,
    # G2 (q9): the end of the audio heard as a whole when the last-word clips are unsure (Whisper hears 30 s)
    "G2_TAIL_S": 25.0,
    # G4 (screen only)
    "G4_MIN": 20,
    "G4_PER": 40,
    "G4_PRE_S": 0.1,
    "G4_POST_S": 1.6,
    # G5
    "G5_SHARE": 0.97,
    "G5_TOL_MS": 300,
    "G5_MEDIAN_MS": 50,
    "G5_MIN_N": 20,
    # G6
    "FLOOR": 0.4,
    "NULL_SHARE": 0.10,
    # stretch
    "STRETCH_X": 4.0,
    "STRETCH_S": 2.5,
    # repair (Q7b, q3). BACK_PENALTY 6.0: in the recited-sequence DP (match +1, inserted ASR word -0.7, unheard
    # word -0.5) a back-jump then needs about four re-recited words. Measured with dense ASR at 2/3/4/5/6/8: the
    # known repeats (005: 5:30 twice, 5:84's tail three times; 62:017: 17:82) are found at every value from 2 to 6
    # (8 loses one pass of 5:84's tail); on 40 untriggered regions of 005, 015, 018 and 62:017 the DP proposes 15,
    # 9, 3, 2, 1 and 0 jumps, of which CTC confirms 1, 1, 0, 0, 0 and 0. Each jump is then confirmed by CTC on the
    # frames of its two passes (CTC_MARGIN, unchanged). REPEAT_MODE "positions": a repeat inside an ayah is written
    # as repeated positions (ADR 0077 decision 4, format 1); Q7c calibrates it on QF Afasy and sets "null" (P14)
    # if the targets are missed. R5 holds every release until the A6(a) record exists.
    # Q7c (q6): on QF Afasy 1, 2, 18, 36 and 59 (100 repeat ayahs, 287 repeat occurrences, 258 control ayahs) the
    # best setting with 0 false repeats reproduces 13% of the occurrences (BACK_PENALTY 1-2, CTC_MARGIN 0), median
    # 159 ms, p90 802 ms, against 90% / 60 / 150; without the CTC confirm at most 20%, with 9 false repeats. Dense
    # Whisper does not hear most of QF's short repeats, and CTC disfavours many of them even on QF's own frames. So
    # REPEAT_MODE is "null" (P14) and BACK_PENALTY and CTC_MARGIN stay: they keep 0 false repeats and the best p90.
    "DENSE_WIN_S": 10,
    "DENSE_HOP_S": 5,
    "BACK_PENALTY": 6.0,
    "CTC_MARGIN": 0.02,
    # Q7g (q7): the repeat proposer is a CTC Viterbi over each ayah's word graph (repeats.viterbi_repeats). On the
    # Q7c set (65 back-jump ayahs, 248 occurrences; 258 controls) it reproduces 95.2-95.6% of the back-jump
    # occurrences with 0 false repeats at every penalty from 5 to 30 (94.4% at 40); MAX_BACK 8, 12 and 15 tie.
    # Penalties 10-30 tie on back-jumps (95.2%, 58 of 65 exact); the safer, higher-penalty end of the tie is 30.
    "VITERBI_PENALTY": 30.0,
    "VITERBI_MAX_BACK": 40,  # experiment: Abadh repeats reach 12+ words back (9:111 43->31)
    "STEP_PROBE_S": 0.5,
    "STEP_SCORE": 85,
    # Q7d: a stretched word with no repeat is a verified elongation when dense ASR over its span hears it at this
    # ratio and hears no other word of the local text at it, and the G3 starts on both sides are OK
    "ELONG_SCORE": 85,
    # Q7c (q6) set "null" after the calibration missed its targets. Q7g (q8): the CI calibration at q7 (GitHub, QF
    # Afasy 1, 2, 18, 36, 59) reproduces 95.2% of the back-jump occurrences with 0 false repeats on 258 controls, so
    # "positions" returns (checks/repeat-calibration.json, second record). Timing is reported, not gated (amendment
    # of 8 Nov 2026): the controls show the same 120 / 515 ms spread, which is the aligner's, not the repeats'.
    "REPEAT_MODE": "positions",
    # Q7h (q8): our word starts are late against QF (median 61, 88, 90 and 122 ms for Al-Husary, Al-Sudais,
    # Al-Minshawi and Al-Afasy on 18, 36, 59). No single shift puts all four within 30 ms, so the criterion is the
    # lit-word wrong time (the app's last-started-word rule): at -80 ms it falls for all four (14.2 -> 10.1%,
    # 13.8 -> 10.7%, 12.0 -> 11.2%, 13.7 -> 8.6%). -80, not -90: Al-Husary already has 10% of words more than 50 ms
    # early and gains nothing past -80. Applied by gated_export to word starts only (Way2Quran); MP3Quran via Q14.
    "WORD_START_SHIFT_MS": -80,
    # release (R2, R3, R4)
    "CAP_NO_HIGHLIGHT": 0.01,
    "CAP_SEG_NULL": 0.02,
    "CAP_UNAVAILABLE": 0.10,
}

# The quality-path sources (P17), relative to the tool folder. Sorted when hashed.
CODE_FILES = tuple(sorted([
    "recitation_align/quality.py",
    "recitation_align/completeness.py",
    "recitation_align/checkpoints.py",
    "recitation_align/gate.py",
    "recitation_align/repeats.py",
    "recitation_align/report.py",
    "recitation_align/gated_export.py",
    "recitation_align/transcribe.py",
    "recitation_align/align.py",
    "recitation_align/snap.py",
    "recitation_align/export.py",
    "scripts/pilot_published.py",
    "scripts/w2q_completeness.py",
    "scripts/w2q_gate.py",
]))

TOOL_ROOT = Path(__file__).resolve().parent.parent


def tool_version() -> str:
    """The `tool_version` written in quality mode: the package version plus the quality version."""
    return f"{__version__}+{QUALITY_VERSION}"


def params_digest() -> str:
    """First 16 hex characters of the sha256 of the canonical JSON of PARAMS."""
    canonical = json.dumps(PARAMS, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:16]


def code_digest(root: Path | None = None) -> str:
    """First 16 hex characters of the sha256 over the CODE_FILES, read in sorted path order.

    Each file contributes its relative path and its bytes. A listed file that does not exist yet
    contributes its path and a "missing" marker, so adding the file later changes the digest.
    `root` defaults to the tool folder, never the working directory.
    """
    base = TOOL_ROOT if root is None else Path(root)
    h = hashlib.sha256()
    for rel in CODE_FILES:
        h.update(rel.encode("utf-8") + b"\0")
        path = base / rel
        if path.is_file():
            h.update(b"present\0")
            h.update(path.read_bytes())
        else:
            h.update(b"missing\0")
        h.update(b"\0")
    return h.hexdigest()[:16]
