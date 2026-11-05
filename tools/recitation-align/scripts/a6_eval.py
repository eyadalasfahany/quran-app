"""A6 accuracy gate: score alignment candidates against two Mishary al-Afasy references.

  refs  : fetch MP3Quran ayah timings (reciter 123) and export QF word segments from the local DB
  run   : align each reference surah with each candidate (resumable)
  eval  : print per-surah ayah-start and word-start errors and the A6 verdict

Candidates: a = defaults, b = --overlap-emissions, c = --no-snap, d = --no-repair.
Local evaluation only: the QF segments are not published; nothing here ships in the app.
Paths are relative to the tool folder; the DB password comes from apps/api/.env.
"""

import argparse
import json
import os
import statistics
import subprocess
import sys
import urllib.request
from pathlib import Path

TOOL = Path(__file__).resolve().parents[1]
REF_DIR = TOOL / "out" / "a6" / "ref"
RUN_DIR = TOOL / "out" / "a6" / "runs"
API_ENV = TOOL.parents[1] / "apps" / "api" / ".env"
MYSQL = os.environ.get("MYSQL_BIN", "/Applications/MAMP/Library/bin/mysql")  # MAMP install by default
SURAHS = [1, 2, 18, 36, 59]
MP3QURAN_READ = 123  # Mishary Rashid al-Afasy, Hafs, on mp3quran.net
CANDIDATES = {
    "a": [],
    "b": ["--overlap-emissions"],
    "c": ["--no-snap"],
    "d": ["--no-repair"],
}
THRESH_MEDIAN_S = 0.3  # A6: ayah-start median error
THRESH_WITHIN_1S = 95.0  # A6: percent of ayah starts within 1 s


def audio_path(ref: str, n: int) -> Path:
    return TOOL / "out" / "audio" / ("mp3quran-afasy" if ref == "mp3" else "qf-afasy") / f"{n:03d}.mp3"


def fetch_mp3quran(n: int) -> list[dict]:
    url = f"https://www.mp3quran.net/api/v3/ayat_timing?surah={n}&read={MP3QURAN_READ}"
    with urllib.request.urlopen(url, timeout=60) as r:
        rows = json.load(r)
    return [{"ayah": x["ayah"], "start_ms": x["start_time"], "end_ms": x["end_time"]}
            for x in rows if x["ayah"] != 0]


def export_qf(n: int, password: str) -> list[dict]:
    sql = (f"select verse_key, start_ms, end_ms, segments from recitation_timings t "
           f"join chapter_audio_files c on c.id=t.audio_file_id join recitations r on r.id=c.recitation_id "
           f"where r.reciter_name like 'Mishari%' and c.chapter_id={n} order by t.verse_id")
    out = subprocess.run([MYSQL, "-h", "127.0.0.1", "-u", "root", f"-p{password}", "quran", "-N", "-B", "-e", sql],
                         capture_output=True, text=True, check=True).stdout
    rows = []
    for line in out.splitlines():
        key, s, e, seg = line.split("\t")
        ayah = int(key.split(":")[1])
        words = [{"index": i, "start_ms": a, "end_ms": b} for i, a, b in json.loads(seg)] if seg != "NULL" else []
        rows.append({"ayah": ayah, "start_ms": int(s), "end_ms": int(e), "words": words})
    return rows


def cmd_refs(_: argparse.Namespace) -> None:
    REF_DIR.mkdir(parents=True, exist_ok=True)
    password = next(line.split("=", 1)[1] for line in API_ENV.read_text().splitlines() if line.startswith("DB_PASSWORD="))
    for n in SURAHS:
        (REF_DIR / f"mp3-{n:03d}.json").write_text(json.dumps(fetch_mp3quran(n), ensure_ascii=False), encoding="utf-8")
        (REF_DIR / f"qf-{n:03d}.json").write_text(json.dumps(export_qf(n, password), ensure_ascii=False), encoding="utf-8")
        print(f"ref {n}: ok")


def cmd_run(args: argparse.Namespace) -> None:
    for ref in ("mp3", "qf"):
        for n in SURAHS:
            if not audio_path(ref, n).is_file():
                print(f"missing audio {ref} {n}", file=sys.stderr)
                continue
            for name, extra in CANDIDATES.items():
                if args.only and name not in args.only:
                    continue
                out = RUN_DIR / f"{ref}-{name}" / f"{n:03d}.json"
                if out.exists():
                    continue
                out.parent.mkdir(parents=True, exist_ok=True)
                cache = TOOL / "out" / "emissions" / f"a6-{ref}-{n:03d}{'-ov' if name == 'b' else ''}.npz"
                cmd = ["uv", "run", "recitation-align", "run", str(audio_path(ref, n)), "--surah", str(n),
                       "--out", str(out), "--emissions-cache", str(cache), *extra]
                print(" ".join(cmd[-12:]), flush=True)
                subprocess.run(cmd, cwd=TOOL, check=True, env={**os.environ, "HF_HUB_OFFLINE": "1"},
                               stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def load_ours(path: Path) -> dict[int, list[dict]]:
    by_ayah: dict[int, list[dict]] = {}
    for w in json.loads(path.read_text(encoding="utf-8"))["words"]:
        by_ayah.setdefault(w["ayah"], []).append(w)
    return by_ayah


def score(ours: dict[int, list[dict]], ref: list[dict], refkind: str) -> dict:
    ayah_err = []
    for r in ref:
        ws = ours.get(r["ayah"])
        if not ws:
            continue
        ayah_err.append(abs(min(w["start_ms"] for w in ws) - r["start_ms"]) / 1000)
    word_err = []
    if refkind == "qf":
        for r in ref:
            ws = [w for w in ours.get(r["ayah"], []) if not w.get("basmala")]
            for rw in r["words"]:
                if 1 <= rw["index"] <= len(ws):
                    word_err.append(abs(ws[rw["index"] - 1]["start_ms"] - rw["start_ms"]) / 1000)
    def pct(xs, t):
        return round(100 * sum(x <= t for x in xs) / len(xs), 1) if xs else None
    return {
        "ayahs": len(ayah_err),
        "ayah_median": round(statistics.median(ayah_err), 3) if ayah_err else None,
        "ayah_within_1s": pct(ayah_err, 1.0),
        "ayah_within_0.3s": pct(ayah_err, 0.3),
        "ayah_max": round(max(ayah_err), 2) if ayah_err else None,
        "word_median": round(statistics.median(word_err), 3) if word_err else None,
        "word_within_0.3s": pct(word_err, 0.3),
    }


def cmd_eval(_: argparse.Namespace) -> None:
    rows = []
    for ref in ("mp3", "qf"):
        for name in CANDIDATES:
            per = []
            for n in SURAHS:
                out = RUN_DIR / f"{ref}-{name}" / f"{n:03d}.json"
                refp = REF_DIR / f"{ref}-{n:03d}.json" if ref == "mp3" else REF_DIR / f"qf-{n:03d}.json"
                if not out.exists() or not refp.exists():
                    continue
                s = score(load_ours(out), json.loads(refp.read_text(encoding="utf-8")), ref)
                per.append((n, s))
                rows.append((ref, name, n, s))
    print(f"{'ref':4} {'cand':4} {'surah':5} {'ayahs':>5} {'med s':>6} {'<=1s%':>6} {'<=0.3s%':>7} {'max s':>6} {'word med':>8} {'word<=0.3%':>10}")
    for ref, name, n, s in rows:
        print(f"{ref:4} {name:4} {n:<5} {s['ayahs']:>5} {s['ayah_median']!s:>6} {s['ayah_within_1s']!s:>6} "
              f"{s['ayah_within_0.3s']!s:>7} {s['ayah_max']!s:>6} {s['word_median']!s:>8} {s['word_within_0.3s']!s:>10}")
    print("\nA6 verdict (median <= 0.3 s and >= 95% of ayah starts within 1 s, pooled over the five surahs):")
    for ref in ("mp3", "qf"):
        for name in CANDIDATES:
            pool_err, pool_w = [], []
            for r, c, n, s in rows:
                if r == ref and c == name:
                    pool_err.append(s)
            if not pool_err:
                continue
            total = sum(s["ayahs"] for s in pool_err)
            within = sum((s["ayah_within_1s"] or 0) * s["ayahs"] for s in pool_err) / total
            med = statistics.median([s["ayah_median"] for s in pool_err])
            ok = med <= THRESH_MEDIAN_S and within >= THRESH_WITHIN_1S
            print(f"  {ref:4} {name}: median of surah medians {med:.3f} s, within 1 s {within:.1f}% -> {'PASS' if ok else 'FAIL'}")


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("refs").set_defaults(func=cmd_refs)
    r = sub.add_parser("run")
    r.add_argument("--only", nargs="*", default=None, help="candidate letters to run, e.g. a b")
    r.set_defaults(func=cmd_run)
    sub.add_parser("eval").set_defaults(func=cmd_eval)
    args = p.parse_args(argv)
    args.func(args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
