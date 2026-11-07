"""Quality-mode reports (ADR 0077 §6, plan way2quran-quality Q1): record validators, the release rules
R1–R7 with the P4 caps, the reciter-report merge and the PR markdown.

Shapes follow the plan's "Data and report formats". A validator raises ValueError naming the missing or
malformed field. Release counts are computed from the surahs, never trusted from the input.
"""

import json
import re
from fractions import Fraction
from math import floor
from pathlib import Path

from .models import ALIGN_MODEL, ALIGN_REVISION, ASR_MODEL, ASR_REVISION
from .quality import PARAMS, code_digest, params_digest, tool_version

SCHEMA = 1
SOURCE = "way2quran"
SURAH_COUNT = 114

COMPLETENESS_VERDICTS = (
    "complete", "incomplete-start", "incomplete-end", "incomplete-both", "incomplete-middle", "unverified",
)
EXCLUDED_REASONS = COMPLETENESS_VERDICTS[1:]
GATE_VERDICTS = ("pass", "repaired", "no_highlight")
SURAH_VERDICTS = ("pass", "repaired", "no_highlight", "unavailable")
# Q3 only: a complete surah whose gate has not run (the gate lands in Q5/Q6). Never releasable.
PENDING = "pending"
REFUSAL_STAGES = ("anchors", "aligner")
KNOWN_FLAGS = ("suspect-duration",)
GATE_CHECKS = ("G0", "G1", "G2", "G3", "G4", "G5", "G6", "stretch", "pause")

COMPLETENESS_STORED = {
    "schema", "surah", "file", "sha256", "bytes", "duration_ms", "source_last_modified", "first_sound_s",
    "last_sound_s", "opening", "ending", "first_heard_ayah", "last_heard_ayah", "ayah_count", "ending_at_s",
    "trailing_s", "windows", "asr_calls_extra", "ms_per_letter", "verdict", "check", "tool_version",
}
COMPLETENESS_KEYS = COMPLETENESS_STORED | {"seconds"}
GATE_STORED = {
    "schema", "surah", "sha256", "tool_version", "verdict", "reasons", "checks", "repairs", "segments_null",
    "cross_ayah",
}
GATE_KEYS = GATE_STORED | {"probes", "seconds"}
REFUSAL_KEYS = {"schema", "surah", "stage", "reason"}
REPORT_KEYS = {
    "schema", "source", "reciter_id", "run_id", "quality_mode", "tool_version", "params_digest",
    "code_digest", "models", "a6a", "release", "surahs",
}
SURAH_ENTRY_KEYS = {"sha256", "verdict", "reason", "flags", "completeness", "gate"}
RELEASE_KEYS = ("listed_surahs",)

_HEX16 = re.compile(r"^[0-9a-f]{16}$")
_HEX64 = re.compile(r"^[0-9a-f]{64}$")


def _require(record, keys, name: str) -> None:
    if not isinstance(record, dict):
        raise ValueError(f"{name} must be an object")
    missing = sorted(k for k in keys if k not in record)
    if missing:
        raise ValueError(f"{name} is missing field(s): {', '.join(missing)}")


def _check_surah(value, name: str) -> None:
    if not isinstance(value, int) or not 1 <= value <= SURAH_COUNT:
        raise ValueError(f"{name} must be a surah number 1..{SURAH_COUNT}")


def validate_completeness(record: dict, *, stored: bool = False) -> None:
    """A completeness record (artifact), or the stored form in a reciter report when `stored` is true."""
    _require(record, COMPLETENESS_STORED if stored else COMPLETENESS_KEYS, "completeness record")
    if record["schema"] != SCHEMA:
        raise ValueError("completeness record has an unknown schema")
    _check_surah(record["surah"], "completeness.surah")
    if not _HEX64.match(str(record["sha256"])):
        raise ValueError("completeness.sha256 must be 64 hex characters")
    if record["verdict"] not in COMPLETENESS_VERDICTS:
        raise ValueError(f"completeness.verdict {record['verdict']!r} is not a known verdict")


def validate_gate(record: dict, *, stored: bool = False) -> None:
    """A gate record (artifact), or the stored form in a reciter report when `stored` is true."""
    _require(record, GATE_STORED if stored else GATE_KEYS, "gate record")
    if record["schema"] != SCHEMA:
        raise ValueError("gate record has an unknown schema")
    _check_surah(record["surah"], "gate.surah")
    if not _HEX64.match(str(record["sha256"])):
        raise ValueError("gate.sha256 must be 64 hex characters")
    if record["verdict"] not in GATE_VERDICTS:
        raise ValueError(f"gate.verdict {record['verdict']!r} is not a known verdict")
    _require(record["checks"], GATE_CHECKS, "gate.checks")


def validate_refusal(record: dict) -> None:
    """A refusal record (artifact): a refused surah is a G1 verdict (P12)."""
    _require(record, REFUSAL_KEYS, "refusal record")
    if record["schema"] != SCHEMA:
        raise ValueError("refusal record has an unknown schema")
    _check_surah(record["surah"], "refusal.surah")
    if record["stage"] not in REFUSAL_STAGES:
        raise ValueError("refusal.stage must be anchors or aligner")


def validate_reciter_report(report: dict) -> None:
    """The committed reciter report (`checks/way2quran-{id}.json`)."""
    _require(report, REPORT_KEYS, "reciter report")
    if report["schema"] != SCHEMA or report["source"] != SOURCE:
        raise ValueError("reciter report has an unknown schema or source")
    if report["quality_mode"] is not True:
        raise ValueError("reciter report is not in quality mode")
    if not _HEX16.match(str(report["params_digest"])) or not _HEX16.match(str(report["code_digest"])):
        raise ValueError("reciter report digests must be 16 hex characters")
    _require(report["models"], ("align", "asr"), "reciter report models")
    _require(report["release"], RELEASE_KEYS, "reciter report release")
    if not isinstance(report["surahs"], dict):
        raise ValueError("reciter report surahs must be an object")
    for key, entry in report["surahs"].items():
        if not key.isdigit() or str(int(key)) != key or not 1 <= int(key) <= SURAH_COUNT:
            raise ValueError(f"surah key {key!r} is not a surah number")
        _require(entry, SURAH_ENTRY_KEYS, f"surah {key} entry")
        if entry["verdict"] not in SURAH_VERDICTS + (PENDING,):
            raise ValueError(f"surah {key} verdict {entry['verdict']!r} is not a known verdict")
        if not _HEX64.match(str(entry["sha256"])):
            raise ValueError(f"surah {key} sha256 must be 64 hex characters")
        unknown = set(entry["flags"]) - set(KNOWN_FLAGS)
        if unknown:
            raise ValueError(f"surah {key} has unknown flag(s): {', '.join(sorted(unknown))}")
        validate_completeness(entry["completeness"], stored=True)
        if entry["verdict"] in ("pass", "repaired"):
            if not isinstance(entry["gate"], dict):
                raise ValueError(f"surah {key} is {entry['verdict']} but has no gate record")
            validate_gate(entry["gate"], stored=True)
        elif entry["gate"] is not None:
            validate_gate(entry["gate"], stored=True)


def _fraction(value) -> Fraction:
    # Exact decimal, so a cap of 0.01 is 1/100 and not a float approximation.
    return Fraction(repr(value))


def release_rules(report: dict, previous: dict | None = None) -> tuple[bool, list[str], dict]:
    """Evaluate R1–R7 (ADR 0077 §6) with the P4 caps.

    Returns (releasable, rules_failed, counts). `previous` is the committed report for R6; None means no
    committed timing files exist yet, so R6 holds.
    """
    validate_reciter_report(report)
    surahs = report["surahs"]
    listed = report["release"]["listed_surahs"]
    failed: list[str] = []

    # R1: every listed surah has a verdict tied to a sha256, and the report is complete and in quality mode.
    if len(surahs) != listed:
        failed.append("R1")
    pending = [e for e in surahs.values() if e["verdict"] == PENDING]

    unavailable = [e for e in surahs.values() if e["verdict"] == "unavailable"]
    available = [e for e in surahs.values() if e["verdict"] != "unavailable"]
    shipped = [e for e in surahs.values() if e["verdict"] in ("pass", "repaired")]
    no_high = [e for e in surahs.values() if e["verdict"] == "no_highlight"]

    available_surahs = listed - len(unavailable)
    available_ayahs = sum(e["completeness"]["ayah_count"] for e in available)
    no_high_ayahs = sum(e["completeness"]["ayah_count"] for e in no_high)
    seg_null_ayahs = sum(len(e["gate"]["segments_null"]) for e in shipped)
    cross_unrep = sum(
        1 for e in shipped for c in e["gate"]["cross_ayah"] if not (isinstance(c, dict) and c.get("represented"))
    )

    # R2: no_highlight surahs number at most floor(1% of available surahs) and hold at most 1% of available ayahs.
    if len(no_high) > floor(_fraction(PARAMS["CAP_NO_HIGHLIGHT"]) * available_surahs) or \
            no_high_ayahs > _fraction(PARAMS["CAP_NO_HIGHLIGHT"]) * available_ayahs:
        failed.append("R2")
    # R3: segments_null ayahs are at most 2% of available ayahs.
    if seg_null_ayahs > _fraction(PARAMS["CAP_SEG_NULL"]) * available_ayahs:
        failed.append("R3")
    # R4: unavailable surahs are at most 10% of the surahs the source lists.
    if len(unavailable) > _fraction(PARAMS["CAP_UNAVAILABLE"]) * listed:
        failed.append("R4")
    # R5: a passing A6(a) record for this exact tool_version, params_digest and code_digest.
    a6a = report["a6a"]
    if pending or not (
        isinstance(a6a, dict) and a6a.get("passed") is True
        and a6a.get("tool_version") == report["tool_version"]
        and a6a.get("params_digest") == report["params_digest"]
        and a6a.get("code_digest") == report["code_digest"]
    ):
        failed.append("R5")
    # R6: every committed pass or repaired timing file keeps a pass or repaired verdict for the same sha256.
    if previous is not None:
        for key, old in previous["surahs"].items():
            if old["verdict"] not in ("pass", "repaired"):
                continue
            new = surahs.get(key)
            if new is None or new["verdict"] not in ("pass", "repaired") or new["sha256"] != old["sha256"]:
                failed.append("R6")
                break
    # R7: no cross-ayah back-jump is left unrepresented.
    if cross_unrep > 0:
        failed.append("R7")

    counts = {
        "listed_surahs": listed,
        "available_surahs": available_surahs,
        "available_ayahs": available_ayahs,
        "pass": sum(1 for e in surahs.values() if e["verdict"] == "pass"),
        "repaired": sum(1 for e in surahs.values() if e["verdict"] == "repaired"),
        "no_highlight": len(no_high),
        "no_highlight_ayahs": no_high_ayahs,
        "segments_null_ayahs": seg_null_ayahs,
        "unavailable": len(unavailable),
        "cross_ayah_unrepresented": cross_unrep,
    }
    if pending:  # present only while the gate does not exist, so a gated report keeps its keys
        counts["pending"] = len(pending)
    return (not failed), failed, counts


def _without(record: dict, keys: tuple[str, ...]) -> dict:
    return {k: v for k, v in record.items() if k not in keys}


def _load_record(path: Path) -> dict | None:
    if not path.is_file():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def merge_reciter_report(
    handoff_dir,
    data_file_entry: dict,
    run_id: str,
    *,
    previous: dict | None = None,
    duration_flags: dict | None = None,
    allow_pending_gate: bool = False,
) -> dict:
    """Build the reciter report from the per-surah records under `handoff_dir`.

    `handoff_dir` holds `completeness/NNN.json`, and `gate/NNN.json` or `refused/NNN.json` for complete
    surahs. `data_file_entry` is the reciter's entry in `way2quran_reciters.json`: `reciter_id` and `files`
    (surah number as a string → file name). Every listed surah needs a completeness record. A complete
    surah needs a gate record or a refusal. `duration_flags` ({surah: [flag]}) is supplied by Q2.
    A refused complete surah is `no_highlight` with reason "G1" (P12).
    `allow_pending_gate` (Q3 only, until the gate exists): a complete surah with neither record becomes
    `pending` with reason "gate-pending" and `gate: null`; the report then can never be releasable.
    """
    base = Path(handoff_dir)
    reciter_id = data_file_entry["reciter_id"]
    files = {int(k): v for k, v in data_file_entry["files"].items()}
    flags_for = duration_flags or {}
    surahs: dict[str, dict] = {}

    for surah in sorted(files):
        name = f"{surah:03d}.json"
        comp = _load_record(base / "completeness" / name)
        if comp is None:
            raise ValueError(f"surah {surah}: no completeness record")
        validate_completeness(comp)
        if comp["surah"] != surah or comp["file"] != files[surah]:
            raise ValueError(f"surah {surah}: completeness record does not match the reciter's file")
        if comp["tool_version"] != tool_version():
            raise ValueError(f"surah {surah}: completeness record is from another tool version")

        gate = _load_record(base / "gate" / name)
        refused = _load_record(base / "refused" / name)
        gate_entry = None
        if comp["verdict"] != "complete":
            verdict, reason = "unavailable", comp["verdict"]
        elif gate is not None:
            validate_gate(gate)
            if gate["surah"] != surah or gate["sha256"] != comp["sha256"]:
                raise ValueError(f"surah {surah}: gate record does not match the completeness sha256")
            if gate["tool_version"] != tool_version():
                raise ValueError(f"surah {surah}: gate record is from another tool version")
            verdict = gate["verdict"]
            reason = ", ".join(gate["reasons"]) or None
            gate_entry = _without(gate, ("probes", "seconds"))
        elif refused is not None:
            validate_refusal(refused)
            verdict, reason = "no_highlight", "G1"
        elif allow_pending_gate:
            verdict, reason = PENDING, "gate-pending"
        else:
            raise ValueError(f"surah {surah}: complete but has no gate or refusal record")

        surahs[str(surah)] = {
            "sha256": comp["sha256"],
            "verdict": verdict,
            "reason": reason,
            "flags": list(flags_for.get(surah, [])),
            "completeness": _without(comp, ("seconds",)),
            "gate": gate_entry,
        }

    report = {
        "schema": SCHEMA,
        "source": SOURCE,
        "reciter_id": reciter_id,
        "run_id": run_id,
        "quality_mode": True,
        "tool_version": tool_version(),
        "params_digest": params_digest(),
        "code_digest": code_digest(),
        "models": {
            "align": f"{ALIGN_MODEL}@{ALIGN_REVISION}",
            "asr": f"{ASR_MODEL}@{ASR_REVISION}",
        },
        "a6a": None,
        "release": {"listed_surahs": len(files)},
        "surahs": surahs,
    }
    releasable, failed, counts = release_rules(report, previous)
    report["release"] = {"releasable": releasable, "rules_failed": failed, **counts}
    return report


def _cell(value) -> str:
    return "—" if value is None else str(value)


def pr_markdown(report: dict) -> str:
    """The PR body for quality mode: releasability, counts, excluded surahs, then the gate per surah."""
    validate_reciter_report(report)
    rel = report["release"]
    releasable = rel.get("releasable")
    if releasable:
        lines = ["Releasable: yes"]
    else:
        lines = [f"Releasable: no (rules failed: {', '.join(rel.get('rules_failed', []))})"]
    lines += ["", "| Verdict | Surahs | Ayahs |", "| --- | ---: | ---: |"]
    surahs = report["surahs"]
    for verdict in SURAH_VERDICTS:
        entries = [e for e in surahs.values() if e["verdict"] == verdict]
        ayahs = sum(e["completeness"]["ayah_count"] for e in entries)
        lines.append(f"| {verdict} | {len(entries)} | {ayahs} |")
    pending = [e for e in surahs.values() if e["verdict"] == PENDING]
    if pending:
        lines.append(f"| {PENDING} | {len(pending)} | {sum(e['completeness']['ayah_count'] for e in pending)} |")

    lines += ["", "## Completeness (excluded)", "", "| Surah | Verdict | Heard | Of |", "| --- | --- | --- | ---: |"]
    for key in sorted(surahs, key=int):
        entry = surahs[key]
        if entry["verdict"] != "unavailable":
            continue
        comp = entry["completeness"]
        first, last = comp["first_heard_ayah"], comp["last_heard_ayah"]
        heard = f"heard {first}–{last}" if first is not None and last is not None else "heard none"
        lines.append(f"| {key} | {entry['reason']} | {heard} | of {comp['ayah_count']} |")

    lines += [
        "", "## Gate per surah", "",
        "| Surah | Verdict | Reasons | G3 ok/n | G5 share | Null segs | Repairs | Pause density | Tail s |",
        "| --- | --- | --- | --- | --- | ---: | ---: | --- | --- |",
    ]
    for key in sorted(surahs, key=int):
        entry = surahs[key]
        gate = entry["gate"]
        if gate is None:
            lines.append(f"| {key} | {entry['verdict']} | {_cell(entry['reason'])} | — | — | — | — | — | — |")
            continue
        checks = gate["checks"]
        g3, g5, g2, pause = checks["G3"], checks["G5"], checks["G2"], checks["pause"]
        lines.append(
            f"| {key} | {entry['verdict']} | {_cell(entry['reason'])} "
            f"| {g3.get('ok')}/{g3.get('n')} | {_cell(g5.get('share_300ms'))} "
            f"| {len(gate['segments_null'])} | {len(gate['repairs'])} "
            f"| {_cell(pause.get('density'))} | {_cell(g2.get('tail_s'))} |"
        )
    return "\n".join(lines) + "\n"
