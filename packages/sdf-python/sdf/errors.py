# Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
"""SDF error codes and exception classes — SDF_FORMAT.md Section 12."""

from typing import Any, Optional

SDF_ERRORS = {
    "NOT_ZIP": "SDF_ERROR_NOT_ZIP",
    "INVALID_META": "SDF_ERROR_INVALID_META",
    "MISSING_FILE": "SDF_ERROR_MISSING_FILE",
    "SCHEMA_MISMATCH": "SDF_ERROR_SCHEMA_MISMATCH",
    "INVALID_SCHEMA": "SDF_ERROR_INVALID_SCHEMA",
    "UNSUPPORTED_VERSION": "SDF_ERROR_UNSUPPORTED_VERSION",
    "INVALID_SIGNATURE": "SDF_ERROR_INVALID_SIGNATURE",
    "INVALID_ARCHIVE": "SDF_ERROR_INVALID_ARCHIVE",
    "ARCHIVE_TOO_LARGE": "SDF_ERROR_ARCHIVE_TOO_LARGE",
}


class SDFError(Exception):
    """Structured SDF error — SDF_FORMAT.md Section 12.2."""

    def __init__(
        self,
        code: str,
        message: str,
        details: Optional[Any] = None,
        file: Optional[str] = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.details = details
        self.file = file

    def to_dict(self) -> dict[str, Any]:
        result: dict[str, Any] = {"code": self.code, "message": str(self)}
        if self.details is not None:
            result["details"] = self.details
        if self.file is not None:
            result["file"] = self.file
        return result


class SDFValidationError(SDFError):
    """Data failed validation against schema."""

    def __init__(self, errors: list[Any], file: Optional[str] = None) -> None:
        super().__init__(
            SDF_ERRORS["SCHEMA_MISMATCH"],
            "data.json failed validation against schema.json.",
            details=errors,
            file=file or "data.json",
        )


class SDFSignatureError(SDFError):
    """Signature verification failed."""

    def __init__(self, message: str = "Invalid or missing signature.") -> None:
        super().__init__(SDF_ERRORS["INVALID_SIGNATURE"], message)
