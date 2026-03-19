# Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
"""SDF validator — meta and schema validation. SDF_FORMAT.md Section 4.6, 7."""

from typing import Any

import jsonschema
from jsonschema import Draft202012Validator

from . import _constants
from .errors import SDFError, SDFValidationError, SDF_ERRORS
from .types import SDFMeta, SDFValidationResult

META_SCHEMA = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://etapsky.github.io/sdf/schemas/meta.schema.json",
    "type": "object",
    "required": ["sdf_version", "document_id", "issuer", "created_at"],
    "properties": {
        "sdf_version": {"type": "string", "pattern": r"^\d+\.\d+$"},
        "document_id": {"type": "string", "format": "uuid"},
        "issuer": {"type": "string", "minLength": 1},
        "created_at": {"type": "string", "format": "date-time"},
        "document_type": {"type": "string"},
        "document_version": {"type": "string"},
        "issuer_id": {"type": "string"},
        "recipient": {"type": "string"},
        "recipient_id": {"type": "string"},
        "schema_id": {"type": "string", "format": "uri"},
        "signature_algorithm": {"type": ["string", "null"]},
        "parent_document_id": {"type": "string", "format": "uuid"},
        "expires_at": {"type": "string", "format": "date-time"},
        "tags": {"type": "array", "items": {"type": "string"}},
    },
    "additionalProperties": False,
}


def validate_meta(meta: Any) -> SDFMeta:
    """Validate meta.json against normative schema. Raises SDFError on failure."""
    try:
        Draft202012Validator(META_SCHEMA).validate(meta)
    except jsonschema.ValidationError as e:
        raise SDFError(
            SDF_ERRORS["INVALID_META"],
            "meta.json is missing required fields or contains invalid values.",
            details=e.message,
            file="meta.json",
        ) from e

    meta_dict = dict(meta)
    file_major = int(meta_dict["sdf_version"].split(".")[0])
    current_major = int(_constants.SDF_VERSION.split(".")[0])
    if file_major > current_major:
        raise SDFError(
            SDF_ERRORS["UNSUPPORTED_VERSION"],
            f"SDF version {meta_dict['sdf_version']} is not supported. "
            f"Maximum supported version is {_constants.SDF_VERSION}.",
            file="meta.json",
        )

    return SDFMeta.from_dict(meta_dict)


def validate_schema(
    data: Any, schema: dict[str, Any]
) -> SDFValidationResult:
    """Validate data against JSON Schema. Returns result object."""
    try:
        validator = Draft202012Validator(schema)
        errors = list(validator.iter_errors(data))
    except jsonschema.SchemaError as e:
        raise SDFError(
            SDF_ERRORS["INVALID_SCHEMA"],
            "schema.json is not a valid JSON Schema document.",
            details=str(e),
            file="schema.json",
        ) from e

    if errors:
        err_list = [
            {
                "code": SDF_ERRORS["SCHEMA_MISMATCH"],
                "message": f"{e.path or '(root)'} {e.message}",
                "details": e,
                "file": "data.json",
            }
            for e in errors
        ]
        return SDFValidationResult(valid=False, errors=err_list)
    return SDFValidationResult(valid=True, errors=[])


def validate_schema_or_throw(data: Any, schema: dict[str, Any]) -> None:
    """Validate data against schema. Raises SDFValidationError on failure."""
    result = validate_schema(data, schema)
    if not result.valid:
        raise SDFValidationError(result.errors, "data.json")
