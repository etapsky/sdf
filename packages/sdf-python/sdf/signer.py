# Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
"""SDF signer — sign and verify .sdf archives. SDF_FORMAT.md Section 11."""

import base64
import json
import zipfile
from io import BytesIO
from typing import Literal, Optional

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, padding, rsa
from cryptography.hazmat.primitives.asymmetric.ec import EllipticCurvePrivateKey
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPrivateKey
from cryptography.hazmat.primitives.asymmetric.types import PrivateKeyTypes, PublicKeyTypes

from .errors import SDFError, SDFSignatureError, SDF_ERRORS


Algorithm = Literal["ECDSA", "RSASSA-PKCS1-v1_5"]


def generate_key_pair(
    algorithm: Algorithm = "ECDSA",
) -> tuple[PrivateKeyTypes, PublicKeyTypes]:
    """Generate ECDSA P-256 or RSA 2048 key pair."""
    if algorithm == "ECDSA":
        priv = ec.generate_private_key(ec.SECP256R1())
        return priv, priv.public_key()
    priv = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )
    return priv, priv.public_key()


def export_public_key(key: PublicKeyTypes) -> str:
    """Export public key as Base64 DER SPKI."""
    der = key.public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return base64.b64encode(der).decode("ascii")


def export_private_key(key: PrivateKeyTypes) -> str:
    """Export private key as Base64 DER PKCS#8."""
    der = key.private_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    return base64.b64encode(der).decode("ascii")


def import_public_key(base64_spki: str, algorithm: Algorithm = "ECDSA") -> PublicKeyTypes:
    """Import public key from Base64 SPKI."""
    raw = base64.b64decode(base64_spki)
    return serialization.load_der_public_key(raw)


def import_private_key(base64_pkcs8: str, algorithm: Algorithm = "ECDSA") -> PrivateKeyTypes:
    """Import private key from Base64 PKCS#8."""
    raw = base64.b64decode(base64_pkcs8)
    return serialization.load_der_private_key(raw, password=None)


def sign_sdf(
    buffer: bytes,
    private_key: PrivateKeyTypes,
    *,
    include_pdf: bool = True,
    algorithm: Algorithm = "ECDSA",
) -> bytes:
    """
    Sign an SDF archive. Inserts signature.sig and updates meta.json.
    Returns the signed archive as bytes.
    """
    try:
        zf = zipfile.ZipFile(BytesIO(buffer), "r")
    except zipfile.BadZipFile:
        raise SDFError(
            SDF_ERRORS["NOT_ZIP"],
            "Cannot open archive for signing.",
        )

    data_raw = zf.read("data.json")
    schema_raw = zf.read("schema.json")
    meta_raw = zf.read("meta.json")
    meta = json.loads(meta_raw.decode("utf-8"))

    content_parts = [data_raw, schema_raw, meta_raw]
    pdf_raw = None
    if include_pdf:
        pdf_raw = zf.read("visual.pdf")
        content_parts.append(pdf_raw)

    content = b"\n\n".join(content_parts)
    zf.close()

    if isinstance(private_key, ec.EllipticCurvePrivateKey):
        sig_bytes = private_key.sign(content, ec.ECDSA(hashes.SHA256()))
    else:
        sig_bytes = private_key.sign(
            content,
            padding.PKCS1v15(),
            hashes.SHA256(),
        )

    meta["signature_algorithm"] = algorithm

    out = BytesIO()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zout:
        if pdf_raw is not None:
            zout.writestr("visual.pdf", pdf_raw)
        zout.writestr("data.json", data_raw)
        zout.writestr("schema.json", schema_raw)
        zout.writestr("meta.json", json.dumps(meta, indent=2))
        zout.writestr("signature.sig", base64.b64encode(sig_bytes).decode("ascii"))

    return out.getvalue()


def verify_sig(
    buffer: bytes,
    public_key: PublicKeyTypes,
    *,
    include_pdf: Optional[bool] = None,
) -> bool:
    """
    Verify detached signature of an SDF archive.
    If include_pdf is None, defaults to True (matches default sign_sdf behavior).
    """
    try:
        zf = zipfile.ZipFile(BytesIO(buffer), "r")
    except zipfile.BadZipFile:
        raise SDFError(SDF_ERRORS["NOT_ZIP"], "File is not a valid ZIP archive.")

    if "signature.sig" not in zf.namelist():
        raise SDFSignatureError("Archive has no signature.sig.")

    data_raw = zf.read("data.json")
    schema_raw = zf.read("schema.json")
    meta_raw = zf.read("meta.json")
    meta = json.loads(meta_raw.decode("utf-8"))
    sig_b64 = zf.read("signature.sig").decode("ascii")

    # Reconstruct content as signed: meta with signature_algorithm=null (original at sign time)
    meta_for_content = dict(meta)
    meta_for_content["signature_algorithm"] = None
    meta_for_content_bytes = json.dumps(meta_for_content, indent=2).encode("utf-8")

    pdf_included = include_pdf if include_pdf is not None else True
    content_parts = [data_raw, schema_raw, meta_for_content_bytes]
    if pdf_included and "visual.pdf" in zf.namelist():
        content_parts.append(zf.read("visual.pdf"))
    zf.close()

    content = b"\n\n".join(content_parts)
    sig_bytes = base64.b64decode(sig_b64)

    try:
        if isinstance(public_key, ec.EllipticCurvePublicKey):
            public_key.verify(sig_bytes, content, ec.ECDSA(hashes.SHA256()))
        else:
            public_key.verify(sig_bytes, content, padding.PKCS1v15(), hashes.SHA256())
    except Exception:
        raise SDFSignatureError("Signature verification failed.")

    return True
