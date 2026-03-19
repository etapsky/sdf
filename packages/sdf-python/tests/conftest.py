# Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
"""Pytest fixtures for SDF tests."""

import json
from pathlib import Path

import pytest

_REPO_ROOT = Path(__file__).resolve().parents[3]  # sdf-python/tests -> repo root
_FIXTURES = Path(__file__).resolve().parent / "fixtures"


@pytest.fixture
def repo_root() -> Path:
    return _REPO_ROOT


@pytest.fixture
def invoice_schema() -> dict:
    with open(_REPO_ROOT / "spec" / "examples" / "invoice" / "schema.json") as f:
        return json.load(f)


@pytest.fixture
def invoice_data() -> dict:
    with open(_REPO_ROOT / "spec" / "examples" / "invoice" / "data.json") as f:
        return json.load(f)


@pytest.fixture
def invoice_sdf_bytes() -> bytes:
    p = _FIXTURES / "invoice.sdf"
    if not p.exists():
        pytest.skip("invoice.sdf fixture not found — run from repo root or copy from spec/poc/output")
    return p.read_bytes()
