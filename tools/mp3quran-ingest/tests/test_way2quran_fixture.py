"""The shared three-surah Way2Quran manifest fixture (plan step 5): a dry run against the fake host, normalised.

The fixture is `tests/fixtures/way2quran-manifest-3.json`. Its `source_url` values carry the production media host
rather than the fake's port, so the file is the same on every run. To regenerate it, run this module's test with
WAY2QURAN_WRITE_FIXTURE=1 and review the diff.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from mp3quran_ingest.api import Mp3QuranApi
from mp3quran_ingest.manifest import write_json_atomic
from mp3quran_ingest.pipeline import IngestRequest, run_ingest
from mp3quran_ingest.way2quran import MEDIA_BASE, Way2QuranSource, parse_reciter

from .fake_way2quran import way2quran_host  # noqa: F401 - fixture
from .fake_way2quran import FakeWay2Quran, file_path, placeholder_audio
from .test_way2quran_data import entry

FIXTURE = Path(__file__).parent / "fixtures" / "way2quran-manifest-3.json"
FIXED_NOW = "2026-11-07T12:00:00Z"
PUBLIC = "https://audio.taybah-app.com"
STUB_DURATION_MS = 1500


def dry_manifest(fake: FakeWay2Quran, tmp_path: Path) -> dict[str, Any]:
    names = {1: "001.mp3", 12: "012.mp3", 79: "79.mp3"}
    for name in names.values():
        fake.files[file_path("fixture-reciter", name)] = placeholder_audio(name, 1000 + len(name))
    source = Way2QuranSource(reciter=parse_reciter(entry()), media_base=fake.host)
    manifest_path = tmp_path / "manifest.json"
    request = IngestRequest(
        moshaf_id=1,
        surahs=None,
        work_dir=tmp_path / "work",
        manifest_path=manifest_path,
        public_base=PUBLIC,
        dry_run=True,
    )
    run_ingest(
        request,
        Mp3QuranApi(fake.host),
        None,
        now=FIXED_NOW,
        measure=lambda _path: STUB_DURATION_MS,
        log=lambda _line: None,
        source=source,
    )
    manifest: dict[str, Any] = json.loads(manifest_path.read_text(encoding="utf-8"))
    for record in manifest["moshafs"]:
        for item in record["files"]:
            item["source_url"] = item["source_url"].replace(fake.host, MEDIA_BASE)
    return manifest


def test_three_surah_dry_run_matches_the_committed_fixture(way2quran_host: FakeWay2Quran, tmp_path: Path) -> None:
    manifest = dry_manifest(way2quran_host, tmp_path)
    if os.environ.get("WAY2QURAN_WRITE_FIXTURE") == "1":
        write_json_atomic(FIXTURE, manifest)
    assert manifest == json.loads(FIXTURE.read_text(encoding="utf-8"))


def test_fixture_is_a_way2quran_manifest_with_three_surahs() -> None:
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    assert fixture["schema"] == 1
    assert fixture["source"] == "way2quran"
    record = fixture["moshafs"][0]
    assert record["moshaf_id"] == 1
    assert record["riwayah"] == "حفص عن عاصم"
    assert record["moshaf_name"].endswith(" - مرتل")
    assert record["surah_list"] == [1, 12, 79]
    assert [f["surah"] for f in record["files"]] == [1, 12, 79]
    assert all(f["key"].startswith("audio/way2quran/1/") for f in record["files"])
    assert all(f["source_url"].startswith(MEDIA_BASE) for f in record["files"])
    assert all(f["source_etag"] is None for f in record["files"])
