# Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
"""
SDF Python — Smart Document Format reference implementation.
SDF_FORMAT.md Section 13 — Reference Implementation.

Usage:
    from sdf import build_sdf, parse_sdf, validate_schema, sign_sdf, verify_sig
"""

from . import _constants
from .errors import SDFError, SDFSignatureError, SDFValidationError, SDF_ERRORS
from .reader import parse_sdf
from .producer import build_sdf
from .validator import validate_meta, validate_schema, validate_schema_or_throw
from .signer import (
    generate_key_pair,
    export_public_key,
    export_private_key,
    import_public_key,
    import_private_key,
    sign_sdf,
    verify_sig,
)
from .types import SDFMeta, SDFParseResult, SDFValidationResult

__all__ = [
    "SDF_VERSION",
    "SDF_MIME_TYPE",
    "SDF_EXTENSION",
    "REQUIRED_FILES",
    "MAX_FILE_SIZE_BYTES",
    "MAX_TOTAL_SIZE_BYTES",
    "SDFError",
    "SDFValidationError",
    "SDFSignatureError",
    "SDF_ERRORS",
    "SDFMeta",
    "SDFParseResult",
    "SDFValidationResult",
    "parse_sdf",
    "build_sdf",
    "validate_meta",
    "validate_schema",
    "validate_schema_or_throw",
    "generate_key_pair",
    "export_public_key",
    "export_private_key",
    "import_public_key",
    "import_private_key",
    "sign_sdf",
    "verify_sig",
]

SDF_VERSION = _constants.SDF_VERSION
SDF_MIME_TYPE = _constants.SDF_MIME_TYPE
SDF_EXTENSION = _constants.SDF_EXTENSION
REQUIRED_FILES = _constants.REQUIRED_FILES
MAX_FILE_SIZE_BYTES = _constants.MAX_FILE_SIZE_BYTES
MAX_TOTAL_SIZE_BYTES = _constants.MAX_TOTAL_SIZE_BYTES
