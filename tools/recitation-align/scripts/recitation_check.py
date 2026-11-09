"""The heavy recitation checks, run on GitHub Actions only (`.github/workflows/recitation-check.yml`, ADR 0077).

    recitation_check.py plan  --check CHECK                      -> the job matrix (JSON) on stdout
    recitation_check.py run   --check CHECK --item JSON --work DIR --out DIR [--shift-ms N] [--base-tool DIR]
    recitation_check.py merge --check CHECK --in DIR --out DIR

Checks (plan way2quran-quality Q7g/Q7h):

- `repeat-calibration`: QF Afasy 1, 2, 18, 36 and 59 through the gate's repeat path (`repeat_calibration.py`), one job
  per surah; `merge` pools them into the `checks/repeat-calibration.json` record shape.
- `real-check`: Way2Quran 1/005, 1/009, 3/018, 3/015 and MP3Quran 62/017 (`checks/real-check.json`): the audio from
  the public source with its sha256 checked, completeness, the quality pass and the gate; the gate records and the
  w2q_explain summary, the cross-ayah entries, and what each stretched word holds (`listen_stretches.py`, Q8). 3/015
  also runs at `--base-tool` (the base commit) and compares the aligned document and the
  gate record, versions, digests and seconds masked.
- `afasy-pipeline`: the full pipeline on QF Afasy 1, 2, 18, 36 and 59 (completeness, quality pass, gate, gated
  export): the verdicts, the gate explanation, G5's numbers with its held-out words against QF (`g5_vs_qf`), and the
  lit-word split for repeat and non-repeat ayahs, at 0 and at `--shift-ms`.
- `word-start`: Q7h's metrics (signed word-start error, lit-word wrong time at shifts -60 to -120) on the first pass
  of Afasy, Al-Husary, Al-Sudais and Al-Minshawi, surahs 18, 36 and 59, over Q7h's control ayahs (no QF repeat, the
  same positions as ours).
- `boundary-model`: Q7h (c), the same reciters and surahs through `boundary_trial.py` (muaalem forced alignment inside
  each QF ayah span, a ceiling) in the venv at $MUAALEM_PYTHON; pooled like `word-start`.
- `abadh-sample`: Q10, as `real-check` on the Abadh surahs of `checks/abadh-sample.json` (each failing check covered,
  short surahs): a gate change is tried here before a full run; the summary sets each verdict against q8's.
- `g2-probe`: Q10, the surahs of `checks/g2-probe.json` aligned (no gate), then `g2_probe.py`: what G2's last-word clip
  and longer or earlier clips hear, with G2's verdict for each.

Each job writes `metrics.json` with its seconds and real-time factor. QF references and audio stay in --work (the
runner's temp folder): only numbers, verdicts and the Way2Quran/MP3Quran gate records reach --out.
"""

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

TOOL = Path(__file__).resolve().parents[1]
REPO = TOOL.parents[1]
sys.path.insert(0, str(TOOL))
sys.path.insert(0, str(TOOL / "scripts"))

import lit_word  # noqa: E402

CHECKS = ("repeat-calibration", "real-check", "afasy-pipeline", "word-start", "boundary-model", "g2-probe", "abadh-sample")
QF_SURAHS = [1, 2, 18, 36, 59]
WORD_START_SURAHS = [18, 36, 59]
# QF chapter recitation packs (content manifest ids) and the reciter id the pipeline uses for their audio
QF_RECITERS = {"afasy": {"pack": 4, "rid": 7}, "husary": {"pack": 3, "rid": 901},
               "sudais": {"pack": 17, "rid": 908}, "minshawi": {"pack": 20, "rid": 911}}
REAL_CHECK = TOOL / "checks" / "real-check.json"
G2_PROBE = TOOL / "checks" / "g2-probe.json"
ABADH_SAMPLE = TOOL / "checks" / "abadh-sample.json"
MASK = {"tool_version", "params_digest", "code_digest", "seconds", "generated_at", "date"}


def plan(check: str) -> list[dict]:
    if check in ("repeat-calibration", "afasy-pipeline"):
        return [{"surah": n} for n in QF_SURAHS]
    if check == "real-check":
        return json.loads(REAL_CHECK.read_text(encoding="utf-8"))["items"]
    if check == "g2-probe":
        return json.loads(G2_PROBE.read_text(encoding="utf-8"))["items"]
    if check == "abadh-sample":
        return json.loads(ABADH_SAMPLE.read_text(encoding="utf-8"))["items"]
    return [{"reciter": r, "surah": n} for r in QF_RECITERS for n in WORD_START_SURAHS]  # word-start, boundary-model


# --- steps -------------------------------------------------------------------------------------------------------------

def _run(tool: Path, args: list[str], check: bool = True) -> int:
    """A tool script under this interpreter, importing `recitation_align` from `tool` (PYTHONPATH wins over the
    installed package, so the base commit runs its own code)."""
    env = dict(os.environ, PYTHONPATH=str(tool), PYTHONUNBUFFERED="1")
    return subprocess.run([sys.executable, *args], cwd=tool, env=env, check=check).returncode


class Clock:
    def __init__(self):
        self.seconds: dict[str, float] = {}

    def __call__(self, stage: str, fn, *a, **k):
        t = time.perf_counter()
        try:
            return fn(*a, **k)
        finally:
            self.seconds[stage] = round(self.seconds.get(stage, 0) + time.perf_counter() - t, 1)


def fetch_qf(reciter: str, surahs: list[int], work: Path) -> Path:
    d = work / f"qf-{reciter}"
    q = QF_RECITERS[reciter]
    _run(TOOL, ["scripts/qf_ref_fetch.py", "--pack-id", str(q["pack"]), "--reciter-id", str(q["rid"]),
                "--out-dir", str(d), "--surah", *map(str, surahs)])
    return d


def audio_seconds(manifest: Path, surahs: list[int]) -> float:
    files = json.loads(manifest.read_text(encoding="utf-8"))["moshafs"][0]["files"]
    return sum(f["duration_ms"] for f in files if f["surah"] in surahs) / 1000


def pipeline(tool: Path, rid: int, surahs: list[int], manifest: Path, audio: Path, base: Path, clock: Clock,
             gate: bool = True, export: bool = False) -> None:
    """Completeness, the quality pass on the complete surahs, then the gate (and the gated export), as add-reciter."""
    d = {k: base / k for k in ("completeness", "asr", "aligned", "emissions", "pauses", "refused", "gate", "export")}
    s = [str(n) for n in surahs]
    clock("completeness", _run, tool, ["scripts/w2q_completeness.py", "--reciter", str(rid), "--manifest",
                                       str(manifest), "--audio-dir", str(audio), "--out-dir", str(d["completeness"]),
                                       "--asr-dir", str(d["asr"]), "--surah", *s])
    complete = json.loads((d["completeness"] / "complete-surahs.json").read_text(encoding="utf-8"))
    for n in (n for n in surahs if n in complete):
        clock("align", _run, tool, ["scripts/pilot_published.py", "--source-kind", "way2quran", "--moshaf", str(rid),
                                    "--aligner-only", "--quality", "--completeness-dir", str(d["completeness"]),
                                    "--manifest", str(manifest), "--audio-dir", str(audio), "--out-dir",
                                    str(d["aligned"]), "--emissions-dir", str(d["emissions"]), "--pauses-dir",
                                    str(d["pauses"]), "--refused-dir", str(d["refused"]), "--asr-dir", str(d["asr"]),
                                    "--surah", str(n)], check=False)  # a refusal is recorded, not a tool error
    if gate:
        clock("gate", _run, tool, ["scripts/w2q_gate.py", "--reciter", str(rid), "--audio-dir", str(audio),
                                   "--aligned-dir", str(d["aligned"]), "--completeness-dir", str(d["completeness"]),
                                   "--refused-dir", str(d["refused"]), "--asr-dir", str(d["asr"]), "--pauses-dir",
                                   str(d["pauses"]), "--out-dir", str(d["gate"]), "--emissions-dir",
                                   str(d["emissions"]), "--surah", *s])
    if export:
        clock("export", _run, tool, ["-m", "recitation_align.gated_export", "--kind", "way2quran", "--recitation-key",
                                     str(rid), "--in", str(d["aligned"]), "--gate-dir", str(d["gate"]), "--out",
                                     str(d["export"]), "--manifest", str(manifest)])


def masked(doc):
    if isinstance(doc, dict):
        return {k: masked(v) for k, v in doc.items() if k not in MASK}
    if isinstance(doc, list):
        return [masked(v) for v in doc]
    return doc


def differences(a, b, path: str = "") -> list[str]:
    """Paths where two masked documents differ (at most 20)."""
    if isinstance(a, dict) and isinstance(b, dict):
        out = []
        for k in sorted(set(a) | set(b), key=str):
            out += differences(a.get(k), b.get(k), f"{path}.{k}")
        return out[:20]
    if isinstance(a, list) and isinstance(b, list) and len(a) == len(b):
        return [d for i, (x, y) in enumerate(zip(a, b)) for d in differences(x, y, f"{path}[{i}]")][:20]
    return [] if a == b else [path or "."]


def _gate_summary(gate_doc: dict | None) -> dict:
    if gate_doc is None:
        return {"verdict": None}
    return {"verdict": gate_doc["verdict"], "reasons": gate_doc.get("reasons"),
            "segments_null": len(gate_doc.get("segments_null") or []), "gate_seconds": gate_doc.get("seconds"),
            "repairs_accepted": sum(bool(r.get("accepted")) for r in gate_doc.get("repairs") or [])}


def g5_vs_qf(held_out_refs: list, refs: list[dict], tol_ms: int = 300) -> dict:
    """G5's held-out words (Q10): which side QF agrees with when our start and the ASR checkpoint disagree. Our start is
    the aligner's, before any repair (the gate's final words are not kept), so repaired regions count as they were."""
    qf: dict = {}
    for r in refs:
        for w in r["words"]:
            qf.setdefault((r["ayah"], w["index"]), w["start_ms"])
    far = ours_ok = both_off = cp_off = n = 0
    for ayah, pos, cp_ms, ours_ms in held_out_refs:
        q = qf.get((ayah, pos))
        if q is None:
            continue
        n += 1
        cp_off += abs(cp_ms - q) > tol_ms
        if abs(ours_ms - cp_ms) > tol_ms:
            far += 1
            ours_ok += abs(ours_ms - q) <= tol_ms
            both_off += abs(ours_ms - q) > tol_ms
    return {"n": n, "ours_far_from_checkpoint": far, "of_which_ours_right_by_qf": ours_ok,
            "of_which_ours_wrong_by_qf": both_off, "checkpoint_off_by_qf": cp_off}


def flags_vs_qf(gate_doc: dict, words: list[dict], refs: list[dict]) -> dict:
    """What QF says about the gate's flags (Q10): each G3-failed ayah start, ours minus QF's, and each stretched word's
    duration against QF's occurrences of that word (several = QF recites it again). Ours is the aligner's, before
    repairs."""
    by_ayah = {r["ayah"]: r for r in refs}
    ours_start: dict = {}
    for w in words:
        if not w.get("basmala"):
            ours_start[w["ayah"]] = min(ours_start.get(w["ayah"], w["start_ms"]), w["start_ms"])
    g3 = []
    for n in gate_doc["checks"].get("G3", {}).get("failed") or []:
        ref = by_ayah.get(n)
        qf_ms = min((w["start_ms"] for w in ref["words"]), default=None) if ref else None
        g3.append({"ayah": n, "ours_ms": ours_start.get(n), "qf_ms": qf_ms,
                   "err_ms": None if qf_ms is None or n not in ours_start else ours_start[n] - qf_ms})
    stretch = []
    for key, position, dur_ms in (gate_doc["checks"].get("stretch") or {}).get("words") or []:
        ref = by_ayah.get(int(key.split(":")[1]))
        occ = [w["end_ms"] - w["start_ms"] for w in ref["words"] if w["index"] == position] if ref else []
        stretch.append({"word": key, "position": position, "ours_ms": dur_ms, "qf_ms": occ,
                        "qf_repeat_in_ayah": bool(ref) and lit_word.is_repeat(ref["words"])})
    return {"g3_failed": g3, "stretch": stretch}


def moved_vs_qf(gate_doc: dict, refs: list[dict]) -> list[dict]:
    """For each ayah a rejected repair would have moved by more than 300 ms, its start before and in the rejected
    candidate, each minus QF's ayah start (Q10: is the moved-neighbour rule refusing a correction?)."""
    qf = {r["ayah"]: min((w["start_ms"] for w in r["words"]), default=None) for r in refs}
    out = []
    for entry in gate_doc.get("repairs") or []:
        starts = entry.get("tried_starts") or {}
        for f in entry.get("failed") or []:
            if not f.startswith("moved "):
                continue
            a = f.split(":")[1]
            if a in starts and qf.get(int(a)) is not None:
                before, after = starts[a]
                out.append({"region": entry["region"], "ayah": int(a), "before_err_ms": before - qf[int(a)],
                            "after_err_ms": after - qf[int(a)]})
    return out


def _read(path: Path):
    return json.loads(path.read_text(encoding="utf-8")) if path.is_file() else None


def _download(url: str, dest: Path, sha256: str) -> None:
    from recitation_align.audio import file_sha256

    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "taybah-recitation-check"})
    with urllib.request.urlopen(req, timeout=600) as r, open(dest, "wb") as f:
        while block := r.read(1 << 20):
            f.write(block)
    if file_sha256(dest) != sha256:
        raise SystemExit(f"{dest.name}: sha256 does not match")


def real_check_audio(item: dict, work: Path) -> tuple[Path, Path]:
    """(manifest, audio dir) for one real-check item, the audio sha256-checked."""
    rid, n = item["reciter"], item["surah"]
    audio, manifest = work / "audio", work / "manifest.json"
    if item["source"] == "way2quran":
        ingest = REPO / "tools" / "mp3quran-ingest"
        subprocess.run(["uv", "run", "--frozen", "mp3quran-ingest", "ingest", "--source", "way2quran", "--reciter",
                        str(rid), "--surah", str(n), "--work-dir", str(audio), "--manifest", str(manifest)],
                       cwd=ingest, check=True, env=dict(os.environ, R2_PUBLIC_BASE="https://audio.taybah-app.com"))
        files = json.loads(manifest.read_text(encoding="utf-8"))["moshafs"][0]["files"]
        if [f["sha256"] for f in files if f["surah"] == n] != [item["sha256"]]:
            raise SystemExit(f"{rid}/{n:03d}: the source audio is not the pinned file")
        return manifest, audio
    timing = json.loads((REPO / item["timing"]).read_text(encoding="utf-8"))["audio"]
    _download(timing["url"], audio / f"{n:03d}.mp3", timing["sha256"])
    files = [{"surah": n, "sha256": timing["sha256"], "bytes": timing["bytes"],
              "duration_ms": timing["measured_duration_ms"], "key": timing["url"].split("audio.taybah-app.com/")[-1],
              "url": timing["url"], "source_url": timing["url"]}]
    manifest.write_text(json.dumps({"moshafs": [{"moshaf_id": rid, "reciter_id": rid, "files": files}]}))
    return manifest, audio


# --- checks ------------------------------------------------------------------------------------------------------------

def run(check: str, item: dict, work: Path, out: Path, shift_ms: int, base_tool: Path | None) -> dict:
    clock, n = Clock(), item["surah"]
    work.mkdir(parents=True, exist_ok=True)
    out.mkdir(parents=True, exist_ok=True)
    res: dict = {"check": check, "item": item}
    if check == "repeat-calibration":
        qf = clock("fetch", fetch_qf, "afasy", [n], work)
        clock("calibration", _run, TOOL, ["scripts/repeat_calibration.py", "--surah", str(n), "--penalty", "10", "20",
                                          "30", "--confirm", "total", "none", "--ref-dir", str(qf / "ref"),
                                          "--audio-dir", str(qf / "audio"), "--cache-dir", str(work / "cache"),
                                          "--raw", str(out / f"raw-{n:03d}.json")])
        res["audio_s"] = audio_seconds(qf / "manifest.json", [n])
    elif check in ("real-check", "abadh-sample"):
        rid = item["reciter"]
        manifest, audio = clock("fetch", real_check_audio, item, work)
        pipeline(TOOL, rid, [n], manifest, audio, work / "ref", clock)
        res["audio_s"] = audio_seconds(manifest, [n])
        gate_doc = _read(work / f"ref/gate/{n:03d}.json")
        res.update(_gate_summary(gate_doc))
        for sub in ("completeness", "gate", "refused"):
            src = work / f"ref/{sub}/{n:03d}.json"
            if src.is_file():
                (out / sub).mkdir(exist_ok=True)
                (out / sub / src.name).write_bytes(src.read_bytes())
        _run(TOOL, ["scripts/w2q_explain.py", "--handoff", str(out), "--surah", str(n), "--out",
                    str(out / "explain.md")])
        res["cross_ayah"] = (gate_doc or {}).get("cross_ayah") or []
        audio_file = audio / f"{n:03d}.mp3"  # the name the gate reads
        if gate_doc is not None and (gate_doc["checks"].get("stretch") or {}).get("words") and audio_file.is_file():
            # Q8: what each stretched word holds (Way2Quran/MP3Quran audio only)
            clock("listen", _run, TOOL, ["scripts/listen_stretches.py", "--gate", str(work / f"ref/gate/{n:03d}.json"),
                                         "--aligned", str(work / f"ref/aligned/{n:03d}.json"), "--audio",
                                         str(audio_file), "--out", str(out)], check=False)
            listened = _read(out / "listen.json")
            res["listen"] = [{k: r.get(k) for k in ("word", "position", "dur_ms", "gate", "class", "other")}
                             for r in (listened or {}).get("stretches", [])]
        if item.get("compare_base") and base_tool is not None:
            pipeline(base_tool, rid, [n], manifest, audio, work / "base", Clock())
            pairs = {"aligned": (work / f"ref/aligned/{n:03d}.json", work / f"base/aligned/{n:03d}.json"),
                     "gate": (work / f"ref/gate/{n:03d}.json", work / f"base/gate/{n:03d}.json")}
            res["compare_base"] = {k: differences(masked(_read(a)), masked(_read(b))) for k, (a, b) in pairs.items()}
            res["identical_to_base"] = not any(res["compare_base"].values())
    elif check == "afasy-pipeline":
        qf = clock("fetch", fetch_qf, "afasy", [n], work)
        pipeline(TOOL, QF_RECITERS["afasy"]["rid"], [n], qf / "manifest.json", qf / "audio", work / "run", clock,
                 export=True)
        res["audio_s"] = audio_seconds(qf / "manifest.json", [n])
        res.update(_gate_summary(_read(work / f"run/gate/{n:03d}.json")))
        # why the gate decided (our gate's findings only; the gate records themselves stay in the job)
        _run(TOOL, ["scripts/w2q_explain.py", "--handoff", str(work / "run"), "--surah", str(n), "--out",
                    str(out / "explain.md")])
        exported = _read(work / f"run/export/{n:03d}.json")
        if exported is None and res["verdict"] in ("pass", "repaired"):
            raise SystemExit(f"{n:03d}: the gate ships timings but gated_export wrote none")
        rows = exported["ayahs"] if exported else None
        refs = json.loads((qf / f"ref/qf-{n:03d}.json").read_text(encoding="utf-8"))
        gate_doc = _read(work / f"run/gate/{n:03d}.json")
        if gate_doc is not None:
            res["g5"] = gate_doc["checks"].get("G5")
        aligned = _read(work / f"run/aligned/{n:03d}.json")
        if aligned is not None:
            res["g5_vs_qf"] = g5_vs_qf((aligned.get("anchors") or {}).get("held_out_refs") or [], refs)
            if gate_doc is not None:
                res["flags_vs_qf"] = flags_vs_qf(gate_doc, aligned["words"], refs)
                res["moved_vs_qf"] = moved_vs_qf(gate_doc, refs)
                res["g3_probes"] = gate_doc.get("probes")
        res["lit"] = {str(s): lit_word.split(rows, refs, n, s) for s in sorted({0, shift_ms})}
    elif check == "g2-probe":
        rid = item["reciter"]
        manifest, audio = clock("fetch", real_check_audio, item, work)
        pipeline(TOOL, rid, [n], manifest, audio, work / "ref", clock, gate=False)
        res["audio_s"] = audio_seconds(manifest, [n])
        clock("probe", _run, TOOL, ["scripts/g2_probe.py", "--aligned", str(work / f"ref/aligned/{n:03d}.json"),
                                    "--audio", str(audio / f"{n:03d}.mp3"), "--out", str(out / "g2.json")])
        res["g2_probe"] = _read(out / "g2.json")
    elif check == "boundary-model":
        rec = item["reciter"]
        qf = clock("fetch", fetch_qf, rec, [n], work)
        res["audio_s"] = audio_seconds(qf / "manifest.json", [n])
        python = os.environ.get("MUAALEM_PYTHON")
        if not python:
            raise SystemExit("boundary-model needs MUAALEM_PYTHON (the trial venv's python)")
        trial = work / "boundary.json"
        env = dict(os.environ, PYTHONPATH=str(TOOL), PYTHONUNBUFFERED="1")
        clock("trial", subprocess.run, [python, "scripts/boundary_trial.py", "--ref", str(qf / f"ref/qf-{n:03d}.json"),
                                        "--audio", str(qf / f"audio/{n:03d}.mp3"), "--surah", str(n), "--out",
                                        str(trial)], cwd=TOOL, env=env, check=True)
        res.update({k: v for k, v in json.loads(trial.read_text(encoding="utf-8")).items() if k != "surah"})
    else:
        rec = item["reciter"]
        qf = clock("fetch", fetch_qf, rec, [n], work)
        pipeline(TOOL, QF_RECITERS[rec]["rid"], [n], qf / "manifest.json", qf / "audio", work / "run", clock,
                 gate=False)
        res["audio_s"] = audio_seconds(qf / "manifest.json", [n])
        doc = _read(work / f"run/aligned/{n:03d}.json")
        res["aligned"] = doc is not None
        if doc is not None:
            from recitation_align.export import build_surah, tanzil_index

            verse_ids, counts = tanzil_index(TOOL / "../../packages/quran-text-check/data/tanzil-quran-simple-1.1.txt")
            rows = build_surah(doc, file_surah=n, kind="way2quran", key="x", source="aligner", audio_url="x",
                               verse_ids=verse_ids, counts=counts)["ayahs"]
            refs = json.loads((qf / f"ref/qf-{n:03d}.json").read_text(encoding="utf-8"))
            res["start_errors"] = lit_word.start_errors(rows, refs, n)
            res.update(lit_word.word_start(rows, refs, n))
    if res.get("gate_seconds") and res.get("audio_s"):  # the speed budget is per gate stage (repair <= 0.4)
        res["gate_rtf"] = {k: round(v / res["audio_s"], 4) for k, v in res["gate_seconds"].items()}
    res["seconds"] = clock.seconds
    total = sum(clock.seconds.values())
    res["rtf"] = {k: round(v / res["audio_s"], 4) for k, v in [*clock.seconds.items(), ("total", total)]} \
        if res.get("audio_s") else None
    (out / "metrics.json").write_text(json.dumps(res, indent=1), encoding="utf-8")
    return res


def merge(check: str, metrics: list[dict]) -> dict:
    """One summary per check: the per-job verdicts and seconds, and the pooled lit-word counts."""
    jobs = [{k: m.get(k) for k in ("item", "verdict", "reasons", "segments_null", "identical_to_base", "audio_s",
                                   "seconds", "rtf", "gate_rtf", "aligned", "start", "cross_ayah", "listen", "g5",
                                   "g5_vs_qf", "flags_vs_qf", "moved_vs_qf", "g3_probes", "g2_probe") if k in m} for m in metrics]
    out: dict = {"check": check, "jobs": jobs}
    if check == "afasy-pipeline":
        pooled: dict = {}
        for m in metrics:
            for s, split in m["lit"].items():
                for kind, counts in split.items():
                    acc = pooled.setdefault(s, {}).setdefault(kind, [0, 0, 0])
                    pooled[s][kind] = [a + b for a, b in zip(acc, counts)]
        out["lit"] = {s: {k: lit_word.shares(v) for k, v in by.items()} for s, by in pooled.items()}
    if check == "abadh-sample":  # the q8 verdict each item carries, against this run's
        out["vs_q8"] = {f"{m['item']['surah']:03d}": [m["item"].get("q8"), m.get("verdict")] for m in metrics}
        out["ships"] = sum(m.get("verdict") in ("pass", "repaired") for m in metrics)
    if check in ("real-check", "abadh-sample"):
        out["cross_ayah"] = {f"{m['item']['reciter']}/{m['item']['surah']:03d}": m.get("cross_ayah") or []
                             for m in metrics}
    if check in ("word-start", "boundary-model"):
        by_reciter: dict = {}
        for m in metrics:
            r = by_reciter.setdefault(m["item"]["reciter"], {"errors": [], "lit": {}})
            r["errors"] += m.get("start_errors", [])
            for s, split in (m.get("lit") or {}).items():  # the ayahs QF recites without a repeat, as Q7h
                r["lit"][s] = [a + b for a, b in zip(r["lit"].get(s, [0, 0, 0]), split["plain"])]
        out["reciters"] = {r: {"start": lit_word.stats(v["errors"]),
                               "lit_wrong": {s: lit_word.shares(c)["wrong"] for s, c in v["lit"].items()}}
                           for r, v in by_reciter.items()}
    return out


def markdown(summary: dict) -> str:
    lines = [f"## {summary['check']}", "", "| job | verdict | audio s | seconds | rtf | gate rtf |",
             "|---|---|---|---|---|---|"]
    for j in summary["jobs"]:
        verdict = j.get("verdict") or ("aligned" if j.get("aligned") else "-")
        if j.get("identical_to_base") is not None:
            verdict += f" (identical to base: {j['identical_to_base']})"
        lines.append(f"| {json.dumps(j['item'])} | {verdict} | {j.get('audio_s')} | {json.dumps(j.get('seconds'))} | "
                     f"{(j.get('rtf') or {}).get('total')} | {json.dumps(j.get('gate_rtf'))} |")
    for key in ("lit", "reciters", "vs_q8", "ships", "cross_ayah"):
        if key in summary:
            lines += ["", f"```json\n{json.dumps(summary[key], indent=1)}\n```"]
    return "\n".join(lines) + "\n"


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("command", choices=("plan", "run", "merge"))
    ap.add_argument("--check", choices=CHECKS, required=True)
    ap.add_argument("--item", type=json.loads, default=None, help="one matrix entry (JSON)")
    ap.add_argument("--work", type=Path, default=None)
    ap.add_argument("--in", dest="in_dir", type=Path, default=None, help="merge: the downloaded job artifacts")
    ap.add_argument("--out", type=Path, default=None)
    ap.add_argument("--shift-ms", default="0", help="afasy-pipeline: a start shift for the lit-word split")
    ap.add_argument("--base-tool", type=Path, default=None, help="real-check: the base commit's tool folder")
    args = ap.parse_args(argv)
    try:
        shift_ms = int(args.shift_ms or 0)
    except ValueError:
        raise SystemExit("--shift-ms must be a whole number of milliseconds") from None
    if not -1000 <= shift_ms <= 1000:
        raise SystemExit("--shift-ms must be within +-1000")

    if args.command == "plan":
        print(json.dumps(plan(args.check)))
        return 0
    if args.command == "run":
        res = run(args.check, args.item, args.work, args.out, shift_ms, args.base_tool)
        summary = markdown(merge(args.check, [res]))
    else:
        metrics = [json.loads(p.read_text(encoding="utf-8")) for p in sorted(args.in_dir.rglob("metrics.json"))]
        args.out.mkdir(parents=True, exist_ok=True)
        if args.check == "repeat-calibration":
            raws = sorted(args.in_dir.rglob("raw-*.json"))
            _run(TOOL, ["scripts/repeat_calibration.py", "--merge", *map(str, raws), "--record", "--out",
                        str(args.out / "repeat-calibration.json")])
        merged = merge(args.check, metrics)
        (args.out / "summary.json").write_text(json.dumps(merged, indent=1), encoding="utf-8")
        summary = markdown(merged)
    print(summary)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as f:
            f.write(summary)
    return 0


if __name__ == "__main__":
    sys.exit(main())
