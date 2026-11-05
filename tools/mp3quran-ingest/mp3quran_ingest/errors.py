"""Exception types. Messages never contain credential values."""


class IngestError(Exception):
    """Any failure that stops the ingest of a surah or a command."""


class ApiError(IngestError):
    """MP3Quran API request failed or returned an unexpected body."""


class DownloadError(IngestError):
    """A surah file could not be downloaded."""


class TruncatedDownload(DownloadError):
    """The bytes received do not match the source Content-Length."""


class AudioError(IngestError):
    """ffmpeg could not decode or measure a file."""


class CredentialsError(IngestError):
    """R2 credentials are missing. Names the variables, never their values."""
