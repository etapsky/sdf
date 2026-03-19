# Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
"""Tests for sdf.producer."""

import zipfile
from io import BytesIO

import pytest

from sdf import build_sdf, parse_sdf, SDF_ERRORS
from sdf.errors import SDFValidationError


def test_build_sdf_produces_valid_zip(invoice_schema: dict, invoice_data: dict) -> None:
    buf = build_sdf(
        invoice_data,
        invoice_schema,
        issuer="Acme Supplies GmbH",
        issuer_id="DE123456789",
        document_type="invoice",
        recipient="Global Logistics AG",
        recipient_id="CH-123.456.789",
    )
    assert isinstance(buf, bytes)
    assert len(buf) > 0

    zf = zipfile.ZipFile(BytesIO(buf), "r")
    names = zf.namelist()
    assert "visual.pdf" in names
    assert "data.json" in names
    assert "schema.json" in names
    assert "meta.json" in names
    zf.close()


def test_build_sdf_roundtrip(invoice_schema: dict, invoice_data: dict) -> None:
    buf = build_sdf(invoice_data, invoice_schema, issuer="Test Issuer")
    result = parse_sdf(buf)
    assert result.data == invoice_data
    assert result.schema == invoice_schema
    assert result.meta.issuer == "Test Issuer"
    assert result.meta.document_type is None
    assert len(result.pdf_bytes) > 0


def test_build_sdf_rejects_invalid_data(invoice_schema: dict) -> None:
    invalid_data = {"document_type": "wrong", "invoice_number": ""}
    with pytest.raises(SDFValidationError) as exc_info:
        build_sdf(invalid_data, invoice_schema, issuer="Test")
    assert exc_info.value.code == SDF_ERRORS["SCHEMA_MISMATCH"]
