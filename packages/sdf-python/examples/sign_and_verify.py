#!/usr/bin/env python3
# Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
"""Sign an SDF with ECDSA and verify the signature."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sdf import build_sdf, sign_sdf, verify_sig, generate_key_pair, parse_sdf
import json

REPO_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_PATH = REPO_ROOT / "spec" / "examples" / "invoice" / "schema.json"
DATA_PATH = REPO_ROOT / "spec" / "examples" / "invoice" / "data.json"


def main() -> None:
    with open(SCHEMA_PATH) as f:
        schema = json.load(f)
    with open(DATA_PATH) as f:
        data = json.load(f)

    # Build unsigned SDF
    buf = build_sdf(data, schema, issuer="Acme Corp")
    print(f"Built unsigned SDF: {len(buf)} bytes")

    # Generate key pair and sign
    priv, pub = generate_key_pair("ECDSA")
    signed = sign_sdf(buf, priv)
    print(f"Signed SDF: {len(signed)} bytes")

    # Verify
    ok = verify_sig(signed, pub)
    print(f"Verification: {'OK' if ok else 'FAILED'}")

    # Parse signed result
    result = parse_sdf(signed)
    print(f"Document ID: {result.meta.document_id}")
    print(f"Signature algorithm: {result.meta.signature_algorithm}")


if __name__ == "__main__":
    main()
