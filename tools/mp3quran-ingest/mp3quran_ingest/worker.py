"""Client for the copy Worker's `POST /copy` (tools/r2-copy-worker/README.md). Stdlib urllib only.

The Worker fetches the surah from the MP3Quran CDN and writes it to R2 itself, so the audio bytes
never leave the Cloudflare side. Messages name the key and the HTTP status, never the URL or token.
"""

from __future__ import annotations

import http.client
import json
import time
import urllib.error
import urllib.request
from collections.abc import Callable
from typing import Any

from .api import USER_AGENT
from .config import WorkerSettings
from .errors import IngestError

DEFAULT_TIMEOUT = 600.0
# Seconds to wait before each retry. Three entries = three retries after the first attempt (four in all).
BACKOFF_SECONDS: tuple[float, ...] = (2.0, 4.0, 8.0)
MAX_REASON = 200
RETRY_STATUSES = frozenset(range(500, 600))  # 502 and other 5xx; 400/401/404/409/422 are never retried


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    """urllib would replay the Authorization header at a redirect target. Refuse redirects instead."""

    def redirect_request(self, req: Any, fp: Any, code: int, msg: str, headers: Any, newurl: str) -> None:
        return None  # urllib then raises HTTPError for the 3xx status, which WorkerClient reports


_OPENER = urllib.request.build_opener(_NoRedirect)


class _Transient(Exception):
    """A failure worth another attempt. Internal: never escapes WorkerClient.copy."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


class WorkerClient:
    def __init__(
        self,
        settings: WorkerSettings,
        *,
        timeout: float = DEFAULT_TIMEOUT,
        backoff: tuple[float, ...] | None = None,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        self._url = settings.copy_url
        self._token = settings.token
        self._timeout = timeout
        self._backoff = BACKOFF_SECONDS if backoff is None else backoff
        self._sleep = sleep

    def copy(self, *, source_url: str, key: str, size: int, sha256: str) -> str:
        """Ask the Worker to copy one file. Returns "copied" (201) or "exists" (200)."""
        payload = json.dumps(
            {"source_url": source_url, "key": key, "bytes": size, "sha256": sha256},
            separators=(",", ":"),
        ).encode("utf-8")
        for attempt in range(len(self._backoff) + 1):
            try:
                return self._post(payload, key)
            except _Transient as exc:
                if attempt == len(self._backoff):
                    raise IngestError(
                        f"worker copy failed for {key} after {attempt + 1} attempts ({exc.reason})"
                    ) from None
                self._sleep(self._backoff[attempt])
        raise AssertionError("unreachable")  # pragma: no cover

    def _post(self, payload: bytes, key: str) -> str:
        request = urllib.request.Request(
            self._url,
            data=payload,
            method="POST",
            headers={
                "Authorization": f"Bearer {self._token}",
                "Content-Type": "application/json",
                "User-Agent": USER_AGENT,
            },
        )
        try:
            with _OPENER.open(request, timeout=self._timeout) as response:
                status = int(response.status)
                body = response.read(64 * 1024)
        except urllib.error.HTTPError as exc:
            status = exc.code
            reason = _reason(exc.read(64 * 1024))
            exc.close()
            if status in RETRY_STATUSES:
                raise _Transient(f"HTTP {status}") from None
            detail = f": {reason}" if reason else ""
            raise IngestError(f"worker refused {key} with HTTP {status}{detail}") from None
        except (urllib.error.URLError, OSError, http.client.HTTPException) as exc:
            # Covers timeouts (TimeoutError is an OSError) and connection failures; names the class only.
            raise _Transient(f"network error {type(exc).__name__}") from None
        if status not in (200, 201):
            raise IngestError(f"worker answered HTTP {status} for {key}, not 200 or 201")
        return _accepted_status(body, key, status)


def _reason(raw: bytes) -> str:
    try:
        data: Any = json.loads(raw.decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        return ""
    if isinstance(data, dict) and isinstance(data.get("error"), str):
        return data["error"][:MAX_REASON]
    return ""


def _accepted_status(raw: bytes, key: str, status: int) -> str:
    try:
        data: Any = json.loads(raw.decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        data = None
    expected = {200: "exists", 201: "copied"}[status]
    if not isinstance(data, dict) or data.get("status") != expected or data.get("key") != key:
        raise IngestError(f"worker response for {key} does not match HTTP {status}")
    return expected
