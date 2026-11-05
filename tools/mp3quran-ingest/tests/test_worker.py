"""Worker client against the local fake Worker: contract statuses, retry policy, secrecy. No network."""

from __future__ import annotations

import json
import socket
from typing import Any

import pytest

from mp3quran_ingest.config import WorkerSettings, load_worker_settings
from mp3quran_ingest.errors import CredentialsError, IngestError
from mp3quran_ingest.worker import WorkerClient

from .conftest import WORKER_TOKEN
from .fake_worker import FakeWorker

KEY = "audio/mp3quran/900/059-" + "ab" * 8 + ".mp3"
SHA = "ab" * 32
SOURCE = "https://cdn.mp3quran.net/audio/test-one/059.mp3"
SIZE = 541_900


class Recorder:
    def __init__(self) -> None:
        self.sleeps: list[float] = []

    def __call__(self, seconds: float) -> None:
        self.sleeps.append(seconds)


def client_for(fake: FakeWorker, recorder: Recorder, timeout: float = 5.0) -> WorkerClient:
    settings = WorkerSettings(url=fake.url, token=WORKER_TOKEN)
    return WorkerClient(settings, timeout=timeout, sleep=recorder)


def copy(client: WorkerClient) -> str:
    return client.copy(source_url=SOURCE, key=KEY, size=SIZE, sha256=SHA)


def test_posts_exact_json_with_bearer_and_no_file_body(fake_worker: FakeWorker) -> None:
    recorder = Recorder()
    assert copy(client_for(fake_worker, recorder)) == "copied"
    assert len(fake_worker.requests) == 1
    sent = fake_worker.requests[0]
    assert sent["method"] == "POST" and sent["path"] == "/copy"
    assert sent["auth"] == f"Bearer {WORKER_TOKEN}"
    assert sent["content_type"] == "application/json"
    assert json.loads(sent["body"]) == {"source_url": SOURCE, "key": KEY, "bytes": SIZE, "sha256": SHA}
    assert sent["length"] == len(sent["body"]) < 1000, "only the small JSON goes out, never the audio"
    assert recorder.sleeps == []


def test_copy_url_is_the_worker_root_plus_copy(fake_worker: FakeWorker) -> None:
    settings = WorkerSettings(url=fake_worker.url + "/", token=WORKER_TOKEN)
    assert settings.copy_url == fake_worker.url + "/copy"


def test_200_exists_is_success(fake_worker: FakeWorker) -> None:
    recorder = Recorder()
    client = client_for(fake_worker, recorder)
    assert copy(client) == "copied"
    assert copy(client) == "exists"
    assert recorder.sleeps == []


def test_409_conflict_is_not_an_exists(fake_worker: FakeWorker) -> None:
    fake_worker.script = [("status", 409, {"error": "an object with this key exists with a different size"})]
    with pytest.raises(IngestError, match="409"):
        copy(client_for(fake_worker, Recorder()))
    assert len(fake_worker.requests) == 1


@pytest.mark.parametrize("status", [400, 401, 404, 422])
def test_non_transient_codes_fail_at_once(fake_worker: FakeWorker, status: int) -> None:
    recorder = Recorder()
    fake_worker.script = [("status", status, {"error": "a short reason"})]
    with pytest.raises(IngestError, match=f"HTTP {status}"):
        copy(client_for(fake_worker, recorder))
    assert len(fake_worker.requests) == 1, "never retried"
    assert recorder.sleeps == []


def test_worker_reason_is_shown_but_token_is_not(fake_worker: FakeWorker) -> None:
    fake_worker.script = [("status", 401, {"error": "unauthorised"})]
    with pytest.raises(IngestError) as info:
        copy(client_for(fake_worker, Recorder()))
    text = str(info.value)
    assert "unauthorised" in text and KEY in text
    assert WORKER_TOKEN not in text and fake_worker.url not in text
    assert info.value.__cause__ is None and info.value.__suppress_context__


def test_redirect_is_refused_so_the_token_never_follows_it(fake_worker: FakeWorker) -> None:
    recorder = Recorder()
    fake_worker.script = [("status", 302, {"error": "moved"})]
    with pytest.raises(IngestError, match="HTTP 302"):
        copy(client_for(fake_worker, recorder))
    assert len(fake_worker.requests) == 1, "the redirect is not followed"
    assert recorder.sleeps == []


def test_502_then_201_is_retried(fake_worker: FakeWorker) -> None:
    recorder = Recorder()
    fake_worker.script = [("status", 502, {"error": "source responded with status 502"})]
    assert copy(client_for(fake_worker, recorder)) == "copied"
    assert len(fake_worker.requests) == 2
    assert recorder.sleeps == [2.0]


def test_persistent_5xx_gives_up_after_three_retries(fake_worker: FakeWorker) -> None:
    recorder = Recorder()
    fake_worker.script = [("status", 503, {"error": "upload to R2 failed"})] * 4
    with pytest.raises(IngestError, match="after 4 attempts") as info:
        copy(client_for(fake_worker, recorder))
    assert len(fake_worker.requests) == 4, "one attempt plus three retries"
    assert recorder.sleeps == [2.0, 4.0, 8.0]
    assert WORKER_TOKEN not in str(info.value)


def test_timeout_is_retried(fake_worker: FakeWorker) -> None:
    recorder = Recorder()
    fake_worker.script = [("sleep", 1.0)]
    assert copy(client_for(fake_worker, recorder, timeout=0.3)) == "copied"
    assert len(fake_worker.requests) == 2
    assert recorder.sleeps == [2.0]


def test_connection_refused_is_retried_and_hides_the_address() -> None:
    probe = socket.socket()
    probe.bind(("127.0.0.1", 0))
    port = probe.getsockname()[1]
    probe.close()
    recorder = Recorder()
    client = WorkerClient(WorkerSettings(url=f"http://127.0.0.1:{port}", token=WORKER_TOKEN), sleep=recorder)
    with pytest.raises(IngestError) as info:
        copy(client)
    assert recorder.sleeps == [2.0, 4.0, 8.0]
    assert str(port) not in str(info.value) and WORKER_TOKEN not in str(info.value)


def test_unexpected_success_body_is_refused(fake_worker: FakeWorker) -> None:
    fake_worker.script = [("status", 201, {"status": "exists", "key": KEY, "size": SIZE})]
    with pytest.raises(IngestError, match="does not match HTTP 201"):
        copy(client_for(fake_worker, Recorder()))
    assert len(fake_worker.requests) == 1


def test_error_text_is_capped(fake_worker: FakeWorker) -> None:
    fake_worker.script = [("status", 400, {"error": "x" * 5000})]
    with pytest.raises(IngestError) as info:
        copy(client_for(fake_worker, Recorder()))
    assert len(str(info.value)) < 600


# Settings: the Worker URL must be https (plain http only on loopback), and messages name variables only.

def test_missing_worker_settings_name_every_variable() -> None:
    with pytest.raises(CredentialsError) as info:
        load_worker_settings(environ={}, env_file=None)
    assert "R2_COPY_WORKER_URL" in str(info.value) and "R2_COPY_TOKEN" in str(info.value)


def test_worker_url_must_be_https_unless_loopback() -> None:
    for url in ("http://taybah-r2-copy.example.workers.dev", "ftp://x.example", "not a url"):
        with pytest.raises(CredentialsError) as info:
            load_worker_settings(environ={"R2_COPY_WORKER_URL": url, "R2_COPY_TOKEN": "t"}, env_file=None)
        assert "R2_COPY_WORKER_URL must be an https URL" in str(info.value)
        assert url not in str(info.value)
    ok = load_worker_settings(environ={"R2_COPY_WORKER_URL": "http://127.0.0.1:9999", "R2_COPY_TOKEN": "t"}, env_file=None)
    assert ok.copy_url == "http://127.0.0.1:9999/copy"
    secure = load_worker_settings(
        environ={"R2_COPY_WORKER_URL": "https://taybah-r2-copy.example.workers.dev", "R2_COPY_TOKEN": "t"},
        env_file=None,
    )
    assert secure.copy_url == "https://taybah-r2-copy.example.workers.dev/copy"


def test_worker_settings_repr_hides_url_and_token() -> None:
    settings = WorkerSettings(url="https://taybah-r2-copy.example.workers.dev", token=WORKER_TOKEN)
    text = repr(settings)
    assert WORKER_TOKEN not in text and "example.workers.dev" not in text


def test_retry_schedule_is_not_shared_between_clients(fake_worker: FakeWorker) -> None:
    # The client reads its backoff at construction, so a test can shorten it without touching the module.
    recorder: Any = Recorder()
    client = WorkerClient(WorkerSettings(url=fake_worker.url, token=WORKER_TOKEN), backoff=(0.0,), sleep=recorder)
    fake_worker.script = [("status", 502, {"error": "x"})]
    assert copy(client) == "copied"
    assert recorder.sleeps == [0.0]
