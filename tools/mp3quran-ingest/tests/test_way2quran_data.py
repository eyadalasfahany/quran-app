"""Way2Quran data file and adapter (ADR 0074 decisions 5, 7 and 8; plan step 5). No network."""

from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

import pytest

from mp3quran_ingest import way2quran as w2q
from mp3quran_ingest.config import DEFAULT_WAY2QURAN_DATA
from mp3quran_ingest.errors import IngestError
from mp3quran_ingest.way2quran import (
    Way2QuranSource,
    find_reciter,
    load_reciters,
    parse_document,
    parse_reciter,
)

PUBLIC_MEDIA = "https://media.way2quran.com"
FIXTURE_ENTRY: dict[str, Any] = {
    "reciter_id": 1,
    "slug": "fixture-reciter",
    "riwayah_folder": "hafs-an-asim",
    "name_ar": "قارئ تجريبي للاختبار",
    "name_en": "Fixture Reciter",
    "moshaf_name": "حفص عن عاصم - مرتل",
    "page_url": "https://way2quran.com/ar/reciters/fixture-reciter",
    "files": {"1": "001.mp3", "12": "012.mp3", "79": "79.mp3"},
}


def entry(**overrides: Any) -> dict[str, Any]:
    value = copy.deepcopy(FIXTURE_ENTRY)
    value.update(overrides)
    if "slug" in overrides and "page_url" not in overrides:
        value["page_url"] = f"https://way2quran.com/ar/reciters/{value['slug']}"
    return value


def write_data(path: Path, reciters: list[dict[str, Any]]) -> Path:
    path.write_text(json.dumps({"schema": 1, "reciters": reciters}, ensure_ascii=False), encoding="utf-8")
    return path


# --- the committed data file ------------------------------------------------------------------

def test_committed_data_file_parses() -> None:
    assert isinstance(load_reciters(DEFAULT_WAY2QURAN_DATA), list)


def test_committed_data_lists_both_reciters_with_their_surahs() -> None:
    """The two reciters from the lister run (plan step 6): 114 files for Abadh, 54 Hafs surahs for Ebadi."""
    by_id = {r.reciter_id: r for r in load_reciters(DEFAULT_WAY2QURAN_DATA)}
    assert sorted(by_id) == [1, 2]
    assert len(by_id[1].files) == 114
    assert sorted(by_id[2].files) == [
        1, 12, 14, 15, 17, 18, 19, 31, 32, 36, 38, 44, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60,
        61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 72, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88,
        93, 99,
    ]
    assert by_id[2].files[79] == "79.mp3", "unpadded name kept as listed"
    assert by_id[2].files[1] == "001.mp3", "padded name kept as listed"


# --- the validator -----------------------------------------------------------------------------

def test_a_valid_entry_parses() -> None:
    reciter = parse_reciter(entry())
    assert reciter.reciter_id == 1
    assert reciter.files == {1: "001.mp3", 12: "012.mp3", 79: "79.mp3"}


@pytest.mark.parametrize(
    "overrides",
    [
        {"reciter_id": 0},
        {"reciter_id": "1"},
        {"reciter_id": True},
        {"slug": "Fixture-Reciter"},
        {"slug": "fixture/reciter"},
        {"slug": ""},
        {"riwayah_folder": "warsh-an-nafi"},
        {"name_ar": "  "},
        {"name_en": None},
        {"moshaf_name": "حفص عن عاصم"},
        {"page_url": "https://example.com/ar/reciters/fixture-reciter"},
        {"files": {}},
        {"files": {"0": "000.mp3"}},
        {"files": {"115": "115.mp3"}},
        {"files": {"01": "001.mp3"}},
        {"files": {"1": "001.wav"}},
        {"files": {"2": "001.mp3"}},
        {"files": {"1": "001.mp3", "12": "001.mp3"}},
    ],
)
def test_bad_entries_are_refused(overrides: dict[str, Any]) -> None:
    with pytest.raises(IngestError):
        parse_reciter(entry(**overrides))


def test_extra_or_missing_keys_are_refused() -> None:
    with pytest.raises(IngestError, match="exactly the keys"):
        parse_reciter(entry(url="https://media.way2quran.com/x"))
    missing = entry()
    del missing["files"]
    with pytest.raises(IngestError, match="exactly the keys"):
        parse_reciter(missing)


def test_document_schema_and_uniqueness_are_checked() -> None:
    with pytest.raises(IngestError, match="schema"):
        parse_document({"schema": 2, "reciters": []})
    with pytest.raises(IngestError, match="exactly schema and reciters"):
        parse_document({"schema": 1, "reciters": [], "extra": 1})
    with pytest.raises(IngestError, match="reciter_id appears twice"):
        parse_document({"schema": 1, "reciters": [entry(), entry(slug="other-slug")]})
    with pytest.raises(IngestError, match="slug appears twice"):
        parse_document({"schema": 1, "reciters": [entry(), entry(reciter_id=2)]})


def test_an_empty_list_is_a_valid_start() -> None:
    assert parse_document({"schema": 1, "reciters": []}) == []


def test_a_surah_key_repeated_in_the_file_is_refused(tmp_path: Path) -> None:
    text = (
        '{"schema": 1, "reciters": [{"reciter_id": 1, "slug": "fixture-reciter", '
        '"riwayah_folder": "hafs-an-asim", "name_ar": "a", "name_en": "b", '
        '"moshaf_name": "حفص عن عاصم - مرتل", "page_url": "https://way2quran.com/ar/reciters/fixture-reciter", '
        '"files": {"79": "79.mp3", "79": "79.mp3"}}]}'
    )
    path = tmp_path / "data.json"
    path.write_text(text, encoding="utf-8")
    with pytest.raises(IngestError, match="repeats the key"):
        load_reciters(path)


def test_a_missing_or_invalid_data_file_is_refused(tmp_path: Path) -> None:
    with pytest.raises(IngestError, match="missing"):
        load_reciters(tmp_path / "absent.json")
    broken = tmp_path / "broken.json"
    broken.write_text("{not json", encoding="utf-8")
    with pytest.raises(IngestError, match="not valid JSON"):
        load_reciters(broken)


def test_find_reciter_reads_the_file_and_refuses_an_unknown_id(tmp_path: Path) -> None:
    data = write_data(tmp_path / "data.json", [entry()])
    assert find_reciter(1, data).slug == "fixture-reciter"
    with pytest.raises(IngestError, match="not in the Way2Quran reciter data file"):
        find_reciter(2, data)


# --- the adapter -------------------------------------------------------------------------------

def source(**overrides: Any) -> Way2QuranSource:
    return Way2QuranSource(reciter=parse_reciter(entry(**overrides)))


def test_source_fields_follow_adr_0074() -> None:
    adapter = source()
    assert adapter.source == "way2quran"
    assert adapter.key_prefix == "audio/way2quran"
    assert adapter.copy_modes == frozenset({"s3"})
    assert adapter.record_last_modified is True
    assert adapter.meta == {
        "moshaf_id": 1,
        "reciter_id": 1,
        "name_ar": "قارئ تجريبي للاختبار",
        "name_en": "Fixture Reciter",
        "riwayah": "حفص عن عاصم",
        "moshaf_name": "حفص عن عاصم - مرتل",
        "surah_list": [1, 12, 79],
    }


def test_url_is_unpadded_for_79_and_padded_for_1() -> None:
    adapter = source()
    assert adapter.source_url(79) == f"{PUBLIC_MEDIA}/fixture-reciter/hafs-an-asim/79.mp3"
    assert adapter.source_url(1) == f"{PUBLIC_MEDIA}/fixture-reciter/hafs-an-asim/001.mp3"


def test_url_uses_the_media_base_only_when_given() -> None:
    adapter = Way2QuranSource(reciter=parse_reciter(entry()), media_base="http://127.0.0.1:9")
    assert adapter.source_url(12) == "http://127.0.0.1:9/fixture-reciter/hafs-an-asim/012.mp3"


def test_an_unlisted_surah_has_no_url() -> None:
    with pytest.raises(IngestError, match="not in the Way2Quran list"):
        source().source_url(2)


def test_the_data_file_holds_no_url_fields() -> None:
    """Only names and numbers: the host and the path come from the adapter, never from the data file."""
    raw = json.dumps(FIXTURE_ENTRY, ensure_ascii=False)
    assert "://" not in raw.replace(FIXTURE_ENTRY["page_url"], "")


def test_to_json_round_trips_through_the_validator() -> None:
    reciter = parse_reciter(entry())
    assert parse_reciter(reciter.to_json()) == reciter
    assert w2q.to_document([reciter])["schema"] == 1
