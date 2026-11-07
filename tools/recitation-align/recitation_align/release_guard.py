"""The release guard (ADR 0077 §6, plan way2quran-quality Q9, P17, P18).

Pure checks over committed data. They recompute the release rules with `report.release_rules` and never trust the
report's own `release.releasable`. They need no model and no network. `git` is the only external call, and only for
the previous report at `base_ref` (R6).

    problems = check_reciter(REPO_ROOT, 3, base_ref="HEAD")   # [] when the reciter may be released
"""

import json
import subprocess
from pathlib import Path

from . import report as R

REPO_ROOT = Path(__file__).resolve().parents[3]
REPORT_DIR = "tools/recitation-align/checks"
A6A_PATH = f"{REPORT_DIR}/a6a-afasy.json"
MANIFEST_PATH = "apps/api/resources/way2quran/manifest.json"
RECITERS_PATH = "tools/mp3quran-ingest/mp3quran_ingest/way2quran_reciters.json"
TIMINGS_DIR = "apps/api/resources/recitation-timings/way2quran"
QURAN_CONFIG = "apps/api/config/quran.php"
RELEASED_KEY = "way2quran_released_reciters"
SHIPPED = ("pass", "repaired")


def report_path(reciter_id: int) -> str:
    return f"{REPORT_DIR}/way2quran-{reciter_id}.json"


def _read_json(path: Path, what: str):
    """The parsed file, or a string that names the problem."""
    if not path.is_file():
        return f"{what} is missing ({path.name})"
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except ValueError as err:
        return f"{what} is not valid JSON: {err}"


def previous_report(root: Path, base_ref: str, reciter_id: int) -> dict | None:
    """The committed report at `base_ref`, or None when that ref has no report for the reciter (R6 then holds).

    An unreadable ref is an error, never a silent pass.
    """
    root = Path(root)
    ok = subprocess.run(["git", "-C", str(root), "rev-parse", "--verify", "--quiet", f"{base_ref}^{{commit}}"],
                        capture_output=True, text=True)
    if ok.returncode != 0:
        raise ValueError(f"RELEASE_BASE_REF {base_ref!r} is not a commit in this checkout")
    spec = f"{base_ref}:{report_path(reciter_id)}"
    exists = subprocess.run(["git", "-C", str(root), "cat-file", "-e", spec], capture_output=True, text=True)
    if exists.returncode != 0:
        return None
    shown = subprocess.run(["git", "-C", str(root), "show", spec], capture_output=True, text=True, check=True)
    try:
        return json.loads(shown.stdout)
    except ValueError as err:
        raise ValueError(f"the report at {base_ref} is not valid JSON: {err}") from err


def _a6a_match(a6a, report: dict):
    """The passing A6(a) record whose three version fields equal the report's (P17), or None."""
    if not isinstance(a6a, dict) or not isinstance(a6a.get("records"), list):
        return None
    for record in a6a["records"]:
        if (isinstance(record, dict) and record.get("passed") is True
                and record.get("tool_version") == report.get("tool_version")
                and record.get("params_digest") == report.get("params_digest")
                and record.get("code_digest") == report.get("code_digest")):
            return record
    return None


def check_reciter(root: Path, reciter_id: int, base_ref: str = "HEAD") -> list[str]:
    """Every reason the reciter must not be released. An empty list means the guard passes."""
    root = Path(root)
    problems: list[str] = []

    report = _read_json(root / report_path(reciter_id), "the reciter report")
    if isinstance(report, str):
        return [report]
    try:
        R.validate_reciter_report(report)  # also requires quality_mode true
    except ValueError as err:
        return [f"the reciter report is invalid: {err}"]
    if report["reciter_id"] != reciter_id:
        problems.append(f"the report is for reciter {report['reciter_id']}, not {reciter_id}")

    # P17: the A6(a) record for this exact version, parameters and code.
    a6a_doc = _read_json(root / A6A_PATH, "the A6(a) record file")
    match = None
    if isinstance(a6a_doc, str):
        problems.append(a6a_doc)
    else:
        match = _a6a_match(a6a_doc, report)
        if match is None:
            problems.append("no passing A6(a) record equals the report's tool_version, params_digest and code_digest")

    # The release rules, recomputed. The report's own `a6a` and `releasable` are ignored.
    previous = None
    try:
        previous = previous_report(root, base_ref, reciter_id)
        recomputed = {**report, "a6a": match}
        _, failed, counts = R.release_rules(recomputed, previous)
    except ValueError as err:
        problems.append(str(err))
        failed, counts = [], {}
    if failed:
        problems.append(f"release rules fail: {', '.join(failed)}")
    if counts.get("cross_ayah_unrepresented", 0) != 0:
        problems.append(f"{counts['cross_ayah_unrepresented']} cross-ayah jump(s) are unrepresented")
    if previous is not None:
        for key, old in previous["surahs"].items():
            new = report["surahs"].get(key)
            if old["verdict"] in SHIPPED and (new is None or new["verdict"] not in SHIPPED):
                problems.append(f"surah {key} was {old['verdict']} at {base_ref} and has been dropped")

    problems += _check_data(root, reciter_id, report)
    return problems


def _check_data(root: Path, reciter_id: int, report: dict) -> list[str]:
    problems: list[str] = []
    surahs = report["surahs"]

    manifest = _read_json(root / MANIFEST_PATH, "the Way2Quran manifest")
    if isinstance(manifest, str):
        return [manifest]
    record = next((m for m in manifest.get("moshafs", []) if str(m.get("moshaf_id")) == str(reciter_id)), None)
    if record is None:
        return [f"the manifest has no reciter {reciter_id}"]
    files = {int(f["surah"]): f for f in record.get("files", [])}
    surah_list = {int(s) for s in record.get("surah_list", [])}

    reciters = _read_json(root / RECITERS_PATH, "the reciter data file")
    excluded: dict[int, dict] = {}
    if isinstance(reciters, str):
        problems.append(reciters)
    else:
        item = next((r for r in reciters.get("reciters", []) if r.get("reciter_id") == reciter_id), None)
        if item is None:
            problems.append(f"the reciter data file has no reciter {reciter_id}")
        else:
            excluded = {int(k): v for k, v in (item.get("excluded") or {}).items()}

    reported = {int(k) for k in surahs}
    if reported != surah_list | set(excluded):
        problems.append("the report's surahs are not the manifest's surah_list plus the excluded surahs")
    if surah_list & set(excluded):
        problems.append(f"surah(s) {sorted(surah_list & set(excluded))} are in both surah_list and excluded")

    timings = root / TIMINGS_DIR / str(reciter_id)
    for key, entry in sorted(surahs.items(), key=lambda kv: int(kv[0])):
        surah = int(key)
        verdict = entry["verdict"]
        if verdict == "unavailable":
            if surah in surah_list or surah in files:
                problems.append(f"surah {surah} is unavailable but is in the manifest's surah_list")
            if surah not in excluded:
                problems.append(f"surah {surah} is unavailable but is not in excluded")
            elif excluded[surah].get("sha256") != entry["sha256"]:
                problems.append(f"surah {surah} sha256 differs from the excluded record")
        else:
            if surah not in files:
                problems.append(f"surah {surah} is not in the manifest")
            elif files[surah].get("sha256") != entry["sha256"]:
                problems.append(f"surah {surah} sha256 differs from the manifest")
            if surah in excluded:
                problems.append(f"surah {surah} is {verdict} but is in excluded")
        path = timings / f"{surah:03d}.json"
        if verdict in SHIPPED:
            doc = _read_json(path, f"surah {surah} timing file")
            if isinstance(doc, str):
                problems.append(f"{verdict} surah {surah} has no readable timing file: {doc}")
            elif (doc.get("audio") or {}).get("sha256") != entry["sha256"]:
                problems.append(f"surah {surah} timing file audio sha256 differs from the report")
        elif path.exists():
            problems.append(f"surah {surah} is {verdict} but has a timing file")

    if timings.is_dir():
        for path in sorted(timings.iterdir()):
            stem = path.name[:-5] if path.name.endswith(".json") else None
            if stem is None or not stem.isdigit() or int(stem) not in reported:
                problems.append(f"timing file {path.name} has no surah in the report")
    return problems
