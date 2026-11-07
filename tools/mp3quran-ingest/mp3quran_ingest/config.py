"""Settings. R2 credentials come only from the environment or a local .env file (ADR 0061 §7).

Settings objects hide the credentials in their repr so they cannot leak through logs.
"""

from __future__ import annotations

import os
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit

from .errors import CredentialsError

TOOL_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = TOOL_ROOT.parents[1]
DEFAULT_ENV_FILE = TOOL_ROOT / ".env"
DEFAULT_API_BASE = "https://www.mp3quran.net/api/v3"
DEFAULT_PUBLIC_BASE = "https://audio.taybah-app.com"
DEFAULT_BUCKET = "quran"
DEFAULT_CATALOGUE_OUT = REPO_ROOT / "apps" / "api" / "resources" / "mp3quran" / "catalogue.json"
DEFAULT_MANIFEST = REPO_ROOT / "apps" / "api" / "resources" / "mp3quran" / "manifest.json"
DEFAULT_WORK_ROOT = TOOL_ROOT / "out" / "audio"
DEFAULT_DRY_MANIFEST = TOOL_ROOT / "out" / "dry-manifest.json"
# Way2Quran (ADR 0074): the committed manifest, its dry-run twin (the loader refuses a manifest of another source),
# and the reciter data file that lists each reciter's exact file names (plan step 5).
DEFAULT_WAY2QURAN_MANIFEST = REPO_ROOT / "apps" / "api" / "resources" / "way2quran" / "manifest.json"
DEFAULT_DRY_WAY2QURAN_MANIFEST = TOOL_ROOT / "out" / "dry-way2quran-manifest.json"
DEFAULT_WAY2QURAN_DATA = TOOL_ROOT / "mp3quran_ingest" / "way2quran_reciters.json"

SECRET_NAMES = ("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY")
PLAIN_NAMES = ("R2_BUCKET", "R2_PUBLIC_BASE")
WORKER_URL_NAME = "R2_COPY_WORKER_URL"
WORKER_TOKEN_NAME = "R2_COPY_TOKEN"
WORKER_NAMES = (WORKER_URL_NAME, WORKER_TOKEN_NAME)
LOOPBACK_HOSTS = frozenset({"127.0.0.1", "localhost"})


@dataclass(frozen=True, repr=False)
class R2Settings:
    account_id: str
    access_key_id: str
    secret_access_key: str
    bucket: str = DEFAULT_BUCKET
    public_base: str = DEFAULT_PUBLIC_BASE

    def __repr__(self) -> str:
        return f"R2Settings(bucket={self.bucket!r}, public_base={self.public_base!r}, credentials=<hidden>)"

    @property
    def endpoint_url(self) -> str:
        return f"https://{self.account_id}.r2.cloudflarestorage.com"


@dataclass(frozen=True, repr=False)
class WorkerSettings:
    """The copy Worker's base URL and bearer token (tools/r2-copy-worker, ADR 0061)."""

    url: str
    token: str

    def __repr__(self) -> str:
        return "WorkerSettings(url=<hidden>, token=<hidden>)"

    @property
    def copy_url(self) -> str:
        return f"{self.url.rstrip('/')}/copy"


def parse_dotenv(text: str) -> dict[str, str]:
    """Parse KEY=VALUE lines. Comments, blank lines and an optional `export ` prefix are allowed."""
    values: dict[str, str] = {}
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :].lstrip()
        if "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        values[key.strip()] = value
    return values


def _lookup(
    environ: Mapping[str, str] | None, env_file: Path | None
) -> tuple[Callable[[str], str], str]:
    """Environment wins over the .env file; the file fills in what the environment leaves out."""
    file_values: dict[str, str] = {}
    if env_file is not None and env_file.is_file():
        file_values = parse_dotenv(env_file.read_text(encoding="utf-8"))
    source: Mapping[str, str] = os.environ if environ is None else environ

    def value_of(name: str) -> str:
        return source.get(name) or file_values.get(name) or ""

    where = str(env_file) if env_file is not None else "the environment"
    return value_of, where


def load_r2_settings(
    environ: Mapping[str, str] | None = None,
    env_file: Path | None = DEFAULT_ENV_FILE,
    *,
    require_credentials: bool = True,
) -> R2Settings:
    value_of, where = _lookup(environ, env_file)
    missing = [name for name in SECRET_NAMES if not value_of(name)]
    if missing and require_credentials:
        raise CredentialsError(
            f"missing R2 settings: {', '.join(missing)} (set them in the environment or in {where})"
        )
    return R2Settings(
        account_id=value_of("R2_ACCOUNT_ID"),
        access_key_id=value_of("R2_ACCESS_KEY_ID"),
        secret_access_key=value_of("R2_SECRET_ACCESS_KEY"),
        bucket=value_of("R2_BUCKET") or DEFAULT_BUCKET,
        public_base=value_of("R2_PUBLIC_BASE") or DEFAULT_PUBLIC_BASE,
    )


def load_worker_settings(
    environ: Mapping[str, str] | None = None,
    env_file: Path | None = DEFAULT_ENV_FILE,
) -> WorkerSettings:
    """Worker mode needs both names. The URL must be https; plain http is allowed only on loopback.

    Error messages name the variables, never their values.
    """
    value_of, where = _lookup(environ, env_file)
    missing = [name for name in WORKER_NAMES if not value_of(name)]
    if missing:
        raise CredentialsError(
            f"missing worker settings: {', '.join(missing)} (set them in the environment or in {where})"
        )
    url = value_of(WORKER_URL_NAME)
    parts = urlsplit(url)
    secure = parts.scheme == "https"
    local = parts.scheme == "http" and parts.hostname in LOOPBACK_HOSTS
    if not (secure or local) or not parts.hostname:
        raise CredentialsError(f"{WORKER_URL_NAME} must be an https URL")
    return WorkerSettings(url=url, token=value_of(WORKER_TOKEN_NAME))
