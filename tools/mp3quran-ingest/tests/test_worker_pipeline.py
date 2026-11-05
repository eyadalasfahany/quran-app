"""Pipeline in worker mode: the Worker copies, the local file is never sent, R2 is HEAD-checked via moto."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from mp3quran_ingest.api import Mp3QuranApi
from mp3quran_ingest.config import R2Settings, WorkerSettings
from mp3quran_ingest.errors import IngestError
from mp3quran_ingest.pipeline import IngestRequest, run_ingest
from mp3quran_ingest.store import R2Store
from mp3quran_ingest.worker import WorkerClient

from .conftest import BUCKET, SECRET, WORKER_TOKEN
from .fake_worker import FakeWorker
from .test_pipeline import NOW, CountingStore, load, measure
from .test_pipeline import request as make_request

ONE_KEY_PREFIX = "audio/mp3quran/900/059-"


def worker_for(fake: FakeWorker) -> WorkerClient:
    return WorkerClient(WorkerSettings(url=fake.url, token=WORKER_TOKEN), timeout=5, backoff=(0.0, 0.0, 0.0))


@pytest.fixture
def mirror(fake_worker: FakeWorker, s3_client: Any) -> FakeWorker:
    """The fake Worker writes into the moto bucket, as the real Worker writes into R2."""
    fake_worker.on_copy = lambda key, size: s3_client.put_object(Bucket=BUCKET, Key=key, Body=b"\0" * size)
    return fake_worker


def worker_request(tmp_path: Path, **overrides: Any) -> IngestRequest:
    values: dict[str, Any] = {"surahs": (59,), "dry_run": False, "via": "worker"}
    values.update(overrides)
    return make_request(tmp_path, **values)


def test_worker_copies_and_head_check_passes(
    tmp_path: Path, api: Mp3QuranApi, store: R2Store, mirror: FakeWorker, fake_server: Any
) -> None:
    counting = CountingStore(store)
    result = run_ingest(worker_request(tmp_path), api, counting, now=NOW, measure=measure,
                        log=lambda _m: None, worker=worker_for(mirror))
    assert (result.uploaded, result.existing, result.processed) == (1, 0, 1)
    assert counting.puts == [], "the local file is never uploaded from this machine"

    sent = mirror.requests[0]
    body = json.loads(sent["body"])
    assert set(body) == {"source_url", "key", "bytes", "sha256"}
    assert body["key"].startswith(ONE_KEY_PREFIX) and body["bytes"] == len(fake_server.files["/audio/test-one/059.mp3"])
    assert sent["length"] < 1000
    entry = load(tmp_path / "manifest.json")["moshafs"][0]["files"][0]
    assert entry["key"] == body["key"] and entry["bytes"] == body["bytes"]
    assert store.object_size(body["key"]) == body["bytes"]


def test_worker_rerun_counts_existing(tmp_path: Path, api: Mp3QuranApi, store: R2Store, mirror: FakeWorker) -> None:
    run_ingest(worker_request(tmp_path), api, store, now=NOW, measure=measure, log=lambda _m: None,
               worker=worker_for(mirror))
    second = run_ingest(
        worker_request(tmp_path, work_dir=tmp_path / "w2", manifest_path=tmp_path / "m2.json"),
        api, store, now=NOW, measure=measure, log=lambda _m: None, worker=worker_for(mirror),
    )
    assert (second.uploaded, second.existing) == (0, 1)
    assert len(mirror.requests) == 2


def test_head_check_catches_a_wrong_size_in_r2(
    tmp_path: Path, api: Mp3QuranApi, store: R2Store, mirror: FakeWorker, s3_client: Any
) -> None:
    mirror.on_copy = lambda key, size: s3_client.put_object(Bucket=BUCKET, Key=key, Body=b"\0" * (size - 1))
    with pytest.raises(IngestError, match="read-back"):
        run_ingest(worker_request(tmp_path), api, store, now=NOW, measure=measure, log=lambda _m: None,
                   worker=worker_for(mirror))
    assert not (tmp_path / "manifest.json").exists(), "a surah that fails the check is not recorded"


def test_worker_failure_stops_the_run_and_keeps_finished_surahs(
    tmp_path: Path, api: Mp3QuranApi, store: R2Store, mirror: FakeWorker
) -> None:
    mirror.script = [("default",), ("status", 401, {"error": "unauthorised"})]
    with pytest.raises(IngestError, match="401"):
        run_ingest(worker_request(tmp_path, surahs=(1, 59)), api, store, now=NOW, measure=measure,
                   log=lambda _m: None, worker=worker_for(mirror))
    files = load(tmp_path / "manifest.json")["moshafs"][0]["files"]
    assert [f["surah"] for f in files] == [1]


def test_worker_mode_needs_a_worker(tmp_path: Path, api: Mp3QuranApi, store: R2Store) -> None:
    with pytest.raises(IngestError, match="worker client is required"):
        run_ingest(worker_request(tmp_path), api, store, now=NOW, measure=measure)


def test_dry_run_never_touches_store_or_worker(tmp_path: Path, api: Mp3QuranApi, mirror: FakeWorker) -> None:
    class Exploding:
        def object_size(self, key: str) -> int | None:
            raise AssertionError("no R2 call in a dry run")

        def put_file(self, key: str, path: Path) -> None:
            raise AssertionError("no upload in a dry run")

        def copy(self, **_kwargs: Any) -> str:
            raise AssertionError("no Worker call in a dry run")

    result = run_ingest(
        make_request(tmp_path, dry_run=True, surahs=(59,), via="worker"),
        api, Exploding(), now=NOW, measure=measure, log=lambda _m: None,  # type: ignore[arg-type]
        worker=Exploding(),  # type: ignore[arg-type]
    )
    assert result.dry_run_files == 1 and mirror.requests == []


def test_token_stays_out_of_logs_manifest_and_errors(
    tmp_path: Path, api: Mp3QuranApi, store: R2Store, mirror: FakeWorker, settings: R2Settings,
    capsys: pytest.CaptureFixture[str], caplog: pytest.LogCaptureFixture,
) -> None:
    mirror.script = [("status", 401, {"error": "unauthorised"})]
    messages: list[str] = []
    with pytest.raises(IngestError) as info:
        run_ingest(worker_request(tmp_path), api, store, now=NOW, measure=measure, log=messages.append,
                   worker=worker_for(mirror))
    captured = capsys.readouterr()
    manifest_text = (tmp_path / "manifest.json").read_text(encoding="utf-8") if (tmp_path / "manifest.json").exists() else ""
    haystacks = [captured.out, captured.err, caplog.text, " ".join(messages), str(info.value),
                 repr(worker_for(mirror)), manifest_text]
    for text in haystacks:
        assert WORKER_TOKEN not in text
        assert SECRET not in text


def test_no_op_rerun_leaves_the_manifest_byte_identical(
    tmp_path: Path, api: Mp3QuranApi, store: R2Store, mirror: FakeWorker
) -> None:
    manifest = tmp_path / "manifest.json"
    run_ingest(worker_request(tmp_path, surahs=(59, 1), manifest_path=manifest), api, store,
               now=NOW, measure=measure, log=lambda _m: None, worker=worker_for(mirror))
    first = manifest.read_bytes()
    run_ingest(worker_request(tmp_path, surahs=(59, 1), manifest_path=manifest, work_dir=tmp_path / "w2"),
               api, store, now="2026-12-01T00:00:00Z", measure=measure, log=lambda _m: None,
               worker=worker_for(mirror))
    assert manifest.read_bytes() == first, "a no-op rerun must not touch generated_at"
    assert load(manifest)["generated_at"] == NOW


def test_a_real_change_moves_generated_at(tmp_path: Path, api: Mp3QuranApi, store: R2Store, mirror: FakeWorker) -> None:
    manifest = tmp_path / "manifest.json"
    run_ingest(worker_request(tmp_path, surahs=(59,), manifest_path=manifest), api, store,
               now=NOW, measure=measure, log=lambda _m: None, worker=worker_for(mirror))
    later = "2026-12-01T00:00:00Z"
    run_ingest(worker_request(tmp_path, surahs=(1,), manifest_path=manifest, work_dir=tmp_path / "w2"),
               api, store, now=later, measure=measure, log=lambda _m: None, worker=worker_for(mirror))
    assert load(manifest)["generated_at"] == later
    assert [f["surah"] for f in load(manifest)["moshafs"][0]["files"]] == [1, 59]
