# Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
"""Tests for sdf.reader."""

import pytest

from sdf import build_sdf, parse_sdf, SDF_ERRORS
from sdf.errors import SDFError


def test_parse_sdf_roundtrip(invoice_schema: dict, invoice_data: dict) -> None:
    """Parse SDF produced by build_sdf — no external fixture needed."""
    buf = build_sdf(invoice_data, invoice_schema, issuer="Test")
    result = parse_sdf(buf)
    assert result.data == invoice_data
    assert result.schema == invoice_schema
    assert result.meta.issuer == "Test"
    assert len(result.pdf_bytes) > 0


def test_parse_sdf_valid(invoice_sdf_bytes: bytes) -> None:
    """Parse pre-built fixture (may differ slightly from spec/examples)."""
    result = parse_sdf(invoice_sdf_bytes)
    assert result.meta.sdf_version == "0.1"
    assert result.meta.issuer is not None
    assert "document_type" in result.data
    assert "invoice_number" in result.data
    assert "totals" in result.data
    assert result.schema.get("$schema") is not None
    assert len(result.pdf_bytes) > 0


def test_parse_sdf_invalid_zip() -> None:
    with pytest.raises(SDFError) as exc_info:
        parse_sdf(b"not a zip file")
    assert exc_info.value.code == SDF_ERRORS["NOT_ZIP"]


def test_parse_sdf_path_traversal() -> None:
    import zipfile
    from io import BytesIO

    buf = BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("data.json", "{}")
        zf.writestr("schema.json", "{}")
        zf.writestr("meta.json", '{"sdf_version":"0.1","document_id":"00000000-0000-0000-0000-000000000000","issuer":"x","created_at":"2026-01-01T00:00:00Z"}')
        zf.writestr("visual.pdf", b"%PDF")
        zf.writestr("../evil.json", "{}")

    with pytest.raises(SDFError) as exc_info:
        parse_sdf(buf.getvalue())
    assert exc_info.value.code == SDF_ERRORS["INVALID_ARCHIVE"]
