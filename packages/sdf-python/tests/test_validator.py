# Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
"""Tests for sdf.validator."""

import pytest

from sdf import validate_schema, validate_meta, validate_schema_or_throw, SDF_ERRORS
from sdf.errors import SDFError, SDFValidationError


def test_validate_schema_valid(invoice_schema: dict, invoice_data: dict) -> None:
    result = validate_schema(invoice_data, invoice_schema)
    assert result.valid is True
    assert result.errors == []


def test_validate_schema_invalid(invoice_schema: dict) -> None:
    invalid_data = {"document_type": "wrong", "invoice_number": ""}
    result = validate_schema(invalid_data, invoice_schema)
    assert result.valid is False
    assert len(result.errors) > 0


def test_validate_schema_or_throw_valid(invoice_schema: dict, invoice_data: dict) -> None:
    validate_schema_or_throw(invoice_data, invoice_schema)


def test_validate_schema_or_throw_invalid(invoice_schema: dict) -> None:
    invalid_data = {}
    with pytest.raises(SDFValidationError) as exc_info:
        validate_schema_or_throw(invalid_data, invoice_schema)
    assert exc_info.value.code == SDF_ERRORS["SCHEMA_MISMATCH"]


def test_validate_meta_valid() -> None:
    meta = {
        "sdf_version": "0.1",
        "document_id": "550e8400-e29b-41d4-a716-446655440000",
        "issuer": "Acme Corp",
        "created_at": "2026-01-15T10:00:00Z",
    }
    result = validate_meta(meta)
    assert result.sdf_version == "0.1"
    assert result.issuer == "Acme Corp"


def test_validate_meta_missing_required() -> None:
    meta = {"sdf_version": "0.1", "document_id": "00000000-0000-0000-0000-000000000000"}
    with pytest.raises(SDFError) as exc_info:
        validate_meta(meta)
    assert exc_info.value.code == SDF_ERRORS["INVALID_META"]


def test_validate_meta_unsupported_version() -> None:
    meta = {
        "sdf_version": "99.0",
        "document_id": "550e8400-e29b-41d4-a716-446655440000",
        "issuer": "Acme",
        "created_at": "2026-01-15T10:00:00Z",
    }
    with pytest.raises(SDFError) as exc_info:
        validate_meta(meta)
    assert exc_info.value.code == SDF_ERRORS["UNSUPPORTED_VERSION"]
