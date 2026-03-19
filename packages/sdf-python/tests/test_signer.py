# Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
"""Tests for sdf.signer."""

import pytest

from sdf import (
    generate_key_pair,
    export_public_key,
    export_private_key,
    import_public_key,
    import_private_key,
    sign_sdf,
    verify_sig,
)
from sdf.errors import SDFError, SDFSignatureError


def test_generate_key_pair_ecdsa() -> None:
    priv, pub = generate_key_pair("ECDSA")
    assert priv is not None
    assert pub is not None


def test_generate_key_pair_rsa() -> None:
    priv, pub = generate_key_pair("RSASSA-PKCS1-v1_5")
    assert priv is not None
    assert pub is not None


def test_export_import_roundtrip() -> None:
    priv, pub = generate_key_pair("ECDSA")
    pub_b64 = export_public_key(pub)
    priv_b64 = export_private_key(priv)
    assert isinstance(pub_b64, str)
    assert isinstance(priv_b64, str)

    pub2 = import_public_key(pub_b64)
    priv2 = import_private_key(priv_b64)
    assert export_public_key(pub2) == pub_b64
    assert export_private_key(priv2) == priv_b64


def test_sign_and_verify(invoice_schema: dict, invoice_data: dict) -> None:
    """Sign and verify using our own build_sdf — ensures roundtrip compatibility."""
    from sdf import build_sdf

    buf = build_sdf(invoice_data, invoice_schema, issuer="Test")
    priv, pub = generate_key_pair("ECDSA")
    signed = sign_sdf(buf, priv, include_pdf=True)
    assert verify_sig(signed, pub) is True


def test_verify_tampered_fails(invoice_schema: dict, invoice_data: dict) -> None:
    from sdf import build_sdf
    import zipfile
    from io import BytesIO

    buf = build_sdf(invoice_data, invoice_schema, issuer="Test")
    priv, pub = generate_key_pair("ECDSA")
    signed = sign_sdf(buf, priv)

    # Tamper with data.json inside the zip — signature must fail
    zf = zipfile.ZipFile(BytesIO(signed), "r")
    data_orig = zf.read("data.json").decode("utf-8")
    zf.close()
    data_tampered = data_orig.replace('"invoice_number": "INV-', '"invoice_number": "XXX-').encode("utf-8")

    out = BytesIO()
    with zipfile.ZipFile(BytesIO(signed), "r") as zf, zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zout:
        for name in zf.namelist():
            if name == "data.json":
                zout.writestr(name, data_tampered)
            else:
                zout.writestr(name, zf.read(name))

    with pytest.raises(SDFSignatureError):
        verify_sig(out.getvalue(), pub)


def test_sign_invalid_zip() -> None:
    priv, _ = generate_key_pair("ECDSA")
    with pytest.raises(SDFError):
        sign_sdf(b"not a zip", priv)


def test_verify_no_signature(invoice_sdf_bytes: bytes) -> None:
    _, pub = generate_key_pair("ECDSA")
    with pytest.raises(SDFSignatureError):
        verify_sig(invoice_sdf_bytes, pub)
