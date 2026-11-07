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

QUALITY_VERSION = "q1"

PARAMS: dict = {
    # G0 completeness
    "KEY_PASS": 80,
    "KEY_UNIQUE": 75,
    "KEY_WORDS": tuple(range(6, 25, 2)),
    "HEAD_CAP_S": 120,
    "TAIL_CAP_S": 300,
    "SOUND_DB": -40,
    "DURATION_FLAG": 0.7,
    # middle gap
    "PACE_BREAK": (0.5, 2.0),
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
    # G2
    "TAIL_MAX_S": 60,
    # G3
    "G3_PRE_S": 0.3,
    "G3_POST_S": 4.5,
    "G3_SCORE": 75,
    "G3_REPROBE": (0.0, 0.6),
    "G3_NEXT_WORDS": 8,
    "G3_CUT_AVOID_S": 3,
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
    # repair. BACK_PENALTY is calibrated in Q7 and is None until then. REPEAT_MODE "null" is the safe
    # default (P14): an uncalibrated repeat highlight does not ship.
    "DENSE_WIN_S": 10,
    "DENSE_HOP_S": 5,
    "BACK_PENALTY": None,
    "CTC_MARGIN": 0.02,
    "STEP_PROBE_S": 0.5,
    "STEP_SCORE": 85,
    "REPEAT_MODE": "null",
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
