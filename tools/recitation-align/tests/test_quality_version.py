"""Quality version, parameter digest and code digest (plan way2quran-quality Q1). No model, no network."""

import re

from recitation_align import quality
from recitation_align.quality import CODE_FILES, PARAMS, QUALITY_VERSION, code_digest, params_digest, tool_version

HEX16 = re.compile(r"^[0-9a-f]{16}$")


def test_tool_version_is_package_version_plus_quality_version():
    assert QUALITY_VERSION == "q7"
    assert tool_version() == "0.1.0+q7"


def test_every_gate_name_is_in_params():
    names = {
        "KEY_PASS", "KEY_UNIQUE", "KEY_WORDS", "HEAD_CAP_S", "TAIL_CAP_S", "SOUND_DB", "DURATION_FLAG",
        "PACE_BREAK", "ADJ_JUMP", "GAP_G3_RUN", "ASR_EVERY", "CUT_SPACING_S", "SCORE_NEAR", "SCORE_FAR",
        "BACK_WORDS", "PACE", "SLOW_WORDS", "EDGE_WORDS", "EDGE_S", "MIN_CONF", "CUT_BACK_FRAMES", "MIN_CP_PER_S",
        "TAIL_MAX_S", "G3_PRE_S", "G3_POST_S", "G3_SCORE", "G3_REPROBE", "G3_NEXT_WORDS", "G3_CUT_AVOID_S", "G3_TIE_DELTA", "G3_TIE_WORDS",
        "G3_MIN_WORDS", "G3_MAX_S", "ELONG_SCORE", "G4_MIN", "G4_PER", "G4_PRE_S", "G4_POST_S", "G5_SHARE", "G5_TOL_MS", "G5_MEDIAN_MS", "G5_MIN_N",
        "FLOOR", "NULL_SHARE", "STRETCH_X", "STRETCH_S", "DENSE_WIN_S", "DENSE_HOP_S", "BACK_PENALTY",
        "CTC_MARGIN", "VITERBI_PENALTY", "VITERBI_MAX_BACK", "STEP_PROBE_S", "STEP_SCORE", "REPEAT_MODE", "CAP_NO_HIGHLIGHT", "CAP_SEG_NULL",
        "CAP_UNAVAILABLE",
    }
    assert names == set(PARAMS)


def test_key_words_is_six_to_twenty_four_step_two():
    assert PARAMS["KEY_WORDS"] == (6, 8, 10, 12, 14, 16, 18, 20, 22, 24)


def test_params_digest_is_sixteen_hex_and_stable():
    digest = params_digest()
    assert HEX16.match(digest)
    assert digest == params_digest()


def test_params_digest_is_pinned_for_q7():
    # Tripwire: a change to PARAMS must bump QUALITY_VERSION and this pin together.
    assert params_digest() == "8ab5b3efbf05b601"


def test_params_digest_changes_when_a_parameter_changes(monkeypatch):
    before = params_digest()
    monkeypatch.setitem(PARAMS, "G3_SCORE", 76)
    assert params_digest() != before


def test_code_digest_is_sixteen_hex():
    assert HEX16.match(code_digest())


def _populate(root, text: str = "x") -> None:
    for rel in CODE_FILES:
        path = root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(f"{rel} {text}\n", encoding="utf-8")


def test_code_digest_changes_when_one_listed_file_changes(tmp_path):
    _populate(tmp_path)
    before = code_digest(tmp_path)
    assert code_digest(tmp_path) == before
    target = tmp_path / "recitation_align" / "gate.py"
    target.write_text("changed\n", encoding="utf-8")
    assert code_digest(tmp_path) != before


def test_code_digest_counts_a_listed_file_that_appears_later(tmp_path):
    _populate(tmp_path)
    before = code_digest(tmp_path)
    (tmp_path / "recitation_align" / "gate.py").unlink()
    assert code_digest(tmp_path) != before


def test_code_digest_ignores_unlisted_files(tmp_path):
    _populate(tmp_path)
    before = code_digest(tmp_path)
    (tmp_path / "recitation_align" / "not_listed.py").write_text("x", encoding="utf-8")
    assert code_digest(tmp_path) == before


def test_code_digest_does_not_depend_on_the_working_directory(tmp_path, monkeypatch):
    default = code_digest()
    elsewhere = tmp_path / "elsewhere"
    elsewhere.mkdir()
    monkeypatch.chdir(elsewhere)
    assert code_digest() == default


def test_code_files_are_sorted_and_cover_p17():
    assert list(CODE_FILES) == sorted(CODE_FILES)
    assert "recitation_align/transcribe.py" in CODE_FILES
    assert "scripts/w2q_gate.py" in CODE_FILES
    assert quality.TOOL_ROOT.name == "recitation-align"


def test_q3_sets_the_repeat_parameters():
    # Q7b: the back-jump penalty is set (it was None until Q7) and repeats inside an ayah are repeated positions
    assert PARAMS["BACK_PENALTY"] == 6.0 and PARAMS["REPEAT_MODE"] in ("positions", "null")


def test_q4_adds_the_pace_adaptive_clip_and_the_elongation_score():
    assert PARAMS["G3_MIN_WORDS"] == 5 and PARAMS["G3_MAX_S"] == 12.0 and PARAMS["ELONG_SCORE"] == 85


def test_q6_writes_repeats_without_segments_after_the_calibration_missed_its_targets():
    # Q7c, P14: checks/repeat-calibration.json records the miss
    assert PARAMS["REPEAT_MODE"] == "null" and PARAMS["SLOW_WORDS"] == 0.6


def test_q7_adds_the_proposer_and_the_near_tie():
    assert PARAMS["VITERBI_PENALTY"] == 30.0 and PARAMS["VITERBI_MAX_BACK"] == 12
    assert PARAMS["G3_TIE_DELTA"] == 2 and PARAMS["G3_TIE_WORDS"] == 3
