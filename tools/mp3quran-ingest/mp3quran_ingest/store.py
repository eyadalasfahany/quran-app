"""R2 through the S3 API (boto3). Built only for a real upload; dry-run never constructs it."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Protocol

from .config import R2Settings
from .errors import IngestError
from .keys import CACHE_CONTROL, CONTENT_TYPE

MISSING_CODES = frozenset({"404", "NoSuchKey", "NotFound"})


class ObjectStore(Protocol):
    def object_size(self, key: str) -> int | None: ...

    def put_file(self, key: str, path: Path) -> None: ...


class R2Store:
    def __init__(self, settings: R2Settings, client: Any | None = None) -> None:
        self._bucket = settings.bucket
        if client is None:
            import boto3
            from botocore.config import Config

            client = boto3.client(
                "s3",
                endpoint_url=settings.endpoint_url,
                aws_access_key_id=settings.access_key_id,
                aws_secret_access_key=settings.secret_access_key,
                region_name="auto",
                config=Config(
                    request_checksum_calculation="when_required",
                    response_checksum_validation="when_required",
                    retries={"max_attempts": 5, "mode": "standard"},
                ),
            )
        self._client = client

    def object_size(self, key: str) -> int | None:
        from botocore.exceptions import BotoCoreError, ClientError

        try:
            response = self._client.head_object(Bucket=self._bucket, Key=key)
        except ClientError as exc:
            code = str(exc.response.get("Error", {}).get("Code", ""))
            if code in MISSING_CODES:
                return None
            raise IngestError(f"R2 HEAD failed for {key} (code {code or 'unknown'})") from None
        except BotoCoreError as exc:
            # Transport errors can carry the endpoint URL, which holds the account id: name only the class.
            raise IngestError(f"R2 HEAD failed for {key} ({type(exc).__name__})") from None
        return int(response["ContentLength"])

    def put_file(self, key: str, path: Path) -> None:
        from botocore.exceptions import BotoCoreError, ClientError

        try:
            with path.open("rb") as body:
                self._client.put_object(
                    Bucket=self._bucket,
                    Key=key,
                    Body=body,
                    ContentType=CONTENT_TYPE,
                    CacheControl=CACHE_CONTROL,
                )
        except ClientError as exc:
            code = str(exc.response.get("Error", {}).get("Code", ""))
            raise IngestError(f"R2 upload failed for {key} (code {code or 'unknown'})") from None
        except BotoCoreError as exc:
            raise IngestError(f"R2 upload failed for {key} ({type(exc).__name__})") from None
