"""The optional `excluded` key of the Way2Quran data file and the `way2quran-exclude` command (ADR 0077, plan Q2).

No network and no audio. Names and ids are read from the committed data file or built from placeholders.
"""

from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

import pytest

from mp3quran_ingest import cli
from mp3quran_ingest.cli import main
from mp3quran_ingest.config import DEFAULT_WAY2QURAN_DATA
from mp3quran_ingest.errors import IngestError
from mp3quran_ingest.way2quran import (
    ListResult,
    carry_exclusions,
    exclude_unavailable,
    load_reciters,
    parse_document,
    parse_reciter,
    to_document,
    write_reciter,
)

from .test_way2quran_data import entry, write_data

SHA = "b" * 64
MODIFIED = "Mon, 01 Jan 2024 00:00:00 GMT"


def excluded_record(surah: int = 12, **overrides: Any) -> dict[str, Any]:
    value: dict[str, Any] = {
        "file": f"{surah:03d}.mp3", "sha256": SHA, "bytes": 5000, "source_last_modified": MODIFIED,
        "reason": "incomplete-both", "first_heard_ayah": 53, "last_heard_ayah": 119, "ayah_count": 128,
        "check": "completeness-1|fixture", "run_id": "1",
    }
    value.update(overrides)
    return value


def with_excluded(**records: dict[str, Any]) -> dict[str, Any]:
    """The fixture entry (files 1, 12, 79) with surah 12 moved to excluded unless records say otherwise."""
    value = entry(files={"1": "001.mp3", "79": "79.mp3"})
    value["excluded"] = {key.removeprefix("s"): rec for key, rec in (records or {"s12": excluded_record()}).items()}
    return value


# --- the data key --------------------------------------------------------------------------------

def test_excluded_round_trips_in_numeric_order() -> None:
    raw = with_excluded(s12=excluded_record(12), s2=excluded_record(2))
    raw["files"] = {"1": "001.mp3", "79": "79.mp3"}
    reciter = parse_reciter(raw)
    assert list(reciter.excluded) == [2, 12]
    again = reciter.to_json()
    assert list(again["excluded"]) == ["2", "12"]
    assert parse_reciter(again) == reciter
    assert list(again["excluded"]["12"]) == list(excluded_record())  # fixed key order, as the plan shows it


def test_a_null_range_and_null_last_modified_are_accepted() -> None:
    raw = with_excluded(s12=excluded_record(reason="unverified", first_heard_ayah=None, last_heard_ayah=None,
                                           source_last_modified=None))
    rec = parse_reciter(raw).excluded[12]
    assert rec.first_heard_ayah is None and rec.source_last_modified is None


def test_a_reciter_without_excluded_serialises_without_the_key() -> None:
    assert "excluded" not in parse_reciter(entry()).to_json()
    assert parse_reciter(entry()).excluded == {}


def test_the_committed_file_is_byte_identical_and_has_no_excluded_key() -> None:
    """The Q0 golden: a data file without `excluded` re-serialises byte for byte."""
    original = DEFAULT_WAY2QURAN_DATA.read_bytes()
    reciters = parse_document(json.loads(original.decode("utf-8")))
    assert all(not r.excluded for r in reciters) or b'"excluded"' in original
    again = json.dumps(to_document(reciters), ensure_ascii=False, indent=2).encode("utf-8") + b"\n"
    assert again == original


def test_a_surah_in_both_files_and_excluded_is_refused() -> None:
    raw = with_excluded()
    raw["files"]["12"] = "012.mp3"
    with pytest.raises(IngestError, match="both files and excluded"):
        parse_reciter(raw)


@pytest.mark.parametrize(
    "overrides",
    [
        {"reason": "complete"},
        {"reason": "nonsense"},
        {"sha256": "abc"},
        {"sha256": "B" * 64},
        {"bytes": "5000"},
        {"bytes": True},
        {"file": "013.mp3"},
        {"file": "12.mp3x"},
        {"first_heard_ayah": 0},
        {"ayah_count": 0},
        {"source_last_modified": 5},
        {"check": ""},
    ],
)
def test_a_bad_excluded_record_is_refused(overrides: dict[str, Any]) -> None:
    with pytest.raises(IngestError):
        parse_reciter(with_excluded(s12=excluded_record(**overrides)))


def test_a_missing_or_extra_field_in_a_record_is_refused() -> None:
    short = excluded_record()
    del short["run_id"]
    with pytest.raises(IngestError, match="exactly the keys"):
        parse_reciter(with_excluded(s12=short))
    with pytest.raises(IngestError, match="exactly the keys"):
        parse_reciter(with_excluded(s12=excluded_record(url="x")))


@pytest.mark.parametrize("key", ["0", "115", "012", "x"])
def test_a_bad_excluded_surah_key_is_refused(key: str) -> None:
    raw = with_excluded()
    raw["excluded"] = {key: excluded_record(12)}
    with pytest.raises(IngestError):
        parse_reciter(raw)


def test_excluded_must_be_an_object() -> None:
    raw = with_excluded()
    raw["excluded"] = []
    with pytest.raises(IngestError, match="excluded must be an object"):
        parse_reciter(raw)


def test_excluded_surahs_are_not_in_the_adapter_surah_list() -> None:
    from mp3quran_ingest.way2quran import Way2QuranSource

    assert Way2QuranSource(parse_reciter(with_excluded())).meta["surah_list"] == [1, 79]


# --- the lister carries exclusions forward ---------------------------------------------------------

REMOTES = {1: (100, MODIFIED), 12: (5000, MODIFIED), 79: (300, MODIFIED)}


def listed():
    return parse_reciter(entry())  # a fresh listing: files 1, 12 and 79, no exclusions


def test_an_unchanged_source_file_stays_excluded() -> None:
    previous = parse_reciter(with_excluded())
    reciter, changed = carry_exclusions(previous, listed(), REMOTES)
    assert changed == []
    assert sorted(reciter.files) == [1, 79] and list(reciter.excluded) == [12]
    assert reciter.excluded[12] == previous.excluded[12]


@pytest.mark.parametrize(
    "remote",
    [(5001, MODIFIED), (5000, "Tue, 02 Jan 2024 00:00:00 GMT"), (5000, None)],
    ids=["size", "last-modified", "no-last-modified"],
)
def test_a_changed_source_file_is_listed_again(remote: tuple[int, str | None]) -> None:
    previous = parse_reciter(with_excluded())
    reciter, changed = carry_exclusions(previous, listed(), {**REMOTES, 12: remote})
    assert changed == [12]
    assert sorted(reciter.files) == [1, 12, 79] and reciter.excluded == {}


def test_a_renamed_source_file_is_listed_again() -> None:
    previous = parse_reciter(with_excluded())
    fresh = parse_reciter(entry(files={"1": "001.mp3", "12": "12.mp3", "79": "79.mp3"}))
    reciter, changed = carry_exclusions(previous, fresh, REMOTES)
    assert changed == [12] and reciter.files[12] == "12.mp3"


def test_without_remotes_every_exclusion_counts_as_changed() -> None:
    reciter, changed = carry_exclusions(parse_reciter(with_excluded()), listed(), None)
    assert changed == [12] and reciter.excluded == {}


def test_a_file_the_source_no_longer_lists_drops_its_exclusion() -> None:
    fresh = parse_reciter(entry(files={"1": "001.mp3", "79": "79.mp3"}))
    reciter, changed = carry_exclusions(parse_reciter(with_excluded()), fresh, REMOTES)
    assert changed == [] and reciter.excluded == {}


def test_write_reciter_carries_exclusions_forward(tmp_path: Path) -> None:
    data = write_data(tmp_path / "data.json", [with_excluded()])
    assert write_reciter(data, listed(), REMOTES) == []
    stored = load_reciters(data)[0]
    assert sorted(stored.files) == [1, 79] and list(stored.excluded) == [12]
    assert write_reciter(data, listed(), {**REMOTES, 12: (1, MODIFIED)}) == [12]
    stored = load_reciters(data)[0]
    assert sorted(stored.files) == [1, 12, 79] and stored.excluded == {}


def test_the_lister_prints_the_changed_message(tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
                                               capsys: pytest.CaptureFixture[str]) -> None:
    data = write_data(tmp_path / "data.json", [with_excluded()])
    result = ListResult(reciter=listed(), ignored=0, total_bytes=1, remotes={**REMOTES, 12: (1, MODIFIED)})
    monkeypatch.setattr(cli, "list_reciter", lambda **_: result)
    args = ["way2quran-list", "--slug", "fixture-reciter", "--reciter-id", "1", "--name-ar", "ا", "--name-en", "x",
            "--data", str(data)]
    assert main(args) == 0
    assert "surah 12 changed on the source; the next run checks it again" in capsys.readouterr().out
    assert list(load_reciters(data)[0].excluded) == [12], "a dry run writes nothing"
    assert main([*args, "--write"]) == 0
    assert load_reciters(data)[0].excluded == {}


# --- way2quran-exclude -----------------------------------------------------------------------------

def unavailable_entry(surah: int, name: str, **overrides: Any) -> dict[str, Any]:
    comp = {
        "file": name, "bytes": 5000, "source_last_modified": MODIFIED, "first_heard_ayah": 53,
        "last_heard_ayah": 119, "ayah_count": 128, "check": "completeness-1|fixture",
    }
    comp.update(overrides)
    return {"sha256": SHA, "verdict": "unavailable", "reason": "incomplete-both", "flags": [],
            "completeness": comp, "gate": None}


def report(reciter_id: int = 1, **surahs: dict[str, Any]) -> dict[str, Any]:
    return {"schema": 1, "source": "way2quran", "reciter_id": reciter_id, "run_id": "7",
            "surahs": {key.removeprefix("s"): value for key, value in surahs.items()}}


PASSING = {"sha256": SHA, "verdict": "pass", "reason": None, "flags": [], "completeness": {}, "gate": {}}


def test_exclude_moves_only_unavailable_surahs() -> None:
    reciter = parse_reciter(entry())
    new, moved = exclude_unavailable(reciter, report(s12=unavailable_entry(12, "012.mp3"), s1=PASSING))
    assert moved == [12]
    assert sorted(new.files) == [1, 79]
    rec = new.excluded[12]
    assert (rec.reason, rec.first_heard_ayah, rec.last_heard_ayah, rec.bytes, rec.run_id) == ("incomplete-both", 53, 119, 5000, "7")
    assert rec.sha256 == SHA and rec.source_last_modified == MODIFIED


def test_exclude_is_idempotent() -> None:
    reciter = parse_reciter(entry())
    rep = report(s12=unavailable_entry(12, "012.mp3"))
    once, _ = exclude_unavailable(reciter, rep)
    twice, moved = exclude_unavailable(once, rep)
    assert moved == [] and twice == once


def test_exclude_refuses_a_report_for_another_reciter_or_file() -> None:
    reciter = parse_reciter(entry())
    with pytest.raises(IngestError, match="not for reciter 1"):
        exclude_unavailable(reciter, report(reciter_id=2, s12=unavailable_entry(12, "012.mp3")))
    with pytest.raises(IngestError, match="is not 012.mp3"):
        exclude_unavailable(reciter, report(s12=unavailable_entry(12, "12.mp3")))
    with pytest.raises(IngestError, match="not in files"):
        exclude_unavailable(reciter, report(s13=unavailable_entry(13, "013.mp3")))


def test_the_exclude_command_dry_run_then_write(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    data = write_data(tmp_path / "data.json", [entry()])
    before = data.read_bytes()
    rep = tmp_path / "report.json"
    rep.write_text(json.dumps(report(s12=unavailable_entry(12, "012.mp3"), s79=PASSING)), encoding="utf-8")
    args = ["way2quran-exclude", "--reciter", "1", "--report", str(rep), "--data", str(data)]
    assert main(args) == 0
    assert data.read_bytes() == before
    assert "surah 12: files -> excluded (incomplete-both, heard 53-119 of 128)" in capsys.readouterr().out
    assert main([*args, "--write"]) == 0
    stored = load_reciters(data)[0]
    assert sorted(stored.files) == [1, 79] and list(stored.excluded) == [12]
    written = data.read_bytes()
    assert main([*args, "--write"]) == 0
    assert data.read_bytes() == written
    assert "nothing to exclude" in capsys.readouterr().out


def test_the_exclude_command_refuses_a_missing_report(tmp_path: Path) -> None:
    data = write_data(tmp_path / "data.json", [entry()])
    assert main(["way2quran-exclude", "--reciter", "1", "--report", str(tmp_path / "none.json"),
                 "--data", str(data)]) == 1


def test_exclude_does_not_change_the_input_reciter() -> None:
    reciter = parse_reciter(entry())
    snapshot = copy.deepcopy(reciter.to_json())
    exclude_unavailable(reciter, report(s12=unavailable_entry(12, "012.mp3")))
    assert reciter.to_json() == snapshot
