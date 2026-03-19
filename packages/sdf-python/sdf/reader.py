# Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
"""SDF reader — parse .sdf archive. SDF_FORMAT.md Section 6."""

import json
import zipfile
from io import BytesIO
from typing import Any, Union

from . import _constants
from .errors import SDFError, SDF_ERRORS
from .types import SDFParseResult, SDFMeta
from .validator import validate_meta, validate_schema_or_throw


def _has_path_traversal(path: str) -> bool:
    return ".." in path or "\\" in path or path.startswith("/")


def _unpack_container(buffer: bytes) -> tuple[bytes, str, str, str]:
    """Unpack ZIP, return (visual_pdf, data_json, schema_json, meta_json)."""
    try:
        zf = zipfile.ZipFile(BytesIO(buffer), "r")
    except zipfile.BadZipFile as e:
        raise SDFError(SDF_ERRORS["NOT_ZIP"], "File is not a valid ZIP archive.") from e

    names = zf.namelist()
    for path in names:
        if _has_path_traversal(path):
            raise SDFError(
                SDF_ERRORS["INVALID_ARCHIVE"],
                f'Archive contains an invalid file path: "{path}".',
                file=path,
            )

    allowed = set(_constants.REQUIRED_FILES) | {"signature.sig"}
    for path in names:
        if zf.getinfo(path).is_dir():
            continue
        name = path.split("/")[0] if "/" in path else path
        if not (name in allowed or name.startswith("vendor/")):
            raise SDFError(
                SDF_ERRORS["INVALID_ARCHIVE"],
                f'Unexpected file at archive root: "{path}".',
                file=path,
            )

    total_size = 0
    for path in names:
        if zf.getinfo(path).is_dir():
            continue
        size = zf.getinfo(path).file_size
        if size > _constants.MAX_FILE_SIZE_BYTES:
            raise SDFError(
                SDF_ERRORS["ARCHIVE_TOO_LARGE"],
                f'File "{path}" exceeds the 50 MB per-file limit.',
                file=path,
            )
        total_size += size
        if total_size > _constants.MAX_TOTAL_SIZE_BYTES:
            raise SDFError(
                SDF_ERRORS["ARCHIVE_TOO_LARGE"],
                "Archive total uncompressed size exceeds the 200 MB limit.",
            )

    for required in _constants.REQUIRED_FILES:
        if required not in names:
            raise SDFError(
                SDF_ERRORS["MISSING_FILE"],
                f'Required file "{required}" is absent from the archive.',
                file=required,
            )

    visual_pdf = zf.read("visual.pdf")
    data_json = zf.read("data.json").decode("utf-8")
    schema_json = zf.read("schema.json").decode("utf-8")
    meta_json = zf.read("meta.json").decode("utf-8")
    zf.close()
    return visual_pdf, data_json, schema_json, meta_json


def parse_sdf(buffer: Union[bytes, bytearray]) -> SDFParseResult:
    """
    Parse an SDF archive. Returns meta, data, schema, and pdf_bytes.
    Raises SDFError on invalid structure.
    """
    data = bytes(buffer)
    visual_pdf, data_json, schema_json, meta_json = _unpack_container(data)

    meta_raw = json.loads(meta_json)
    if not isinstance(meta_raw, dict):
        raise SDFError(
            SDF_ERRORS["INVALID_META"],
            "meta.json is not valid JSON.",
            file="meta.json",
        )
    meta = validate_meta(meta_raw)

    schema_raw: Any = json.loads(schema_json)
    if not isinstance(schema_raw, dict):
        raise SDFError(
            SDF_ERRORS["INVALID_SCHEMA"],
            "schema.json is not a valid JSON object.",
            file="schema.json",
        )

    data_raw: Any = json.loads(data_json)
    if not isinstance(data_raw, dict):
        raise SDFError(
            SDF_ERRORS["SCHEMA_MISMATCH"],
            "data.json is not a valid JSON object.",
            file="data.json",
        )
    validate_schema_or_throw(data_raw, schema_raw)

    return SDFParseResult(
        meta=meta,
        data=data_raw,
        schema=schema_raw,
        pdf_bytes=visual_pdf,
    )
