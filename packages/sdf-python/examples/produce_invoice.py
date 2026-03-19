#!/usr/bin/env python3
# Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
"""Produce an SDF invoice from schema and data."""

import json
import sys
from pathlib import Path

# Add parent for sdf import when run as script
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sdf import build_sdf

REPO_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_PATH = REPO_ROOT / "spec" / "examples" / "invoice" / "schema.json"
DATA_PATH = REPO_ROOT / "spec" / "examples" / "invoice" / "data.json"
OUTPUT_PATH = Path("invoice.sdf")


def main() -> None:
    with open(SCHEMA_PATH) as f:
        schema = json.load(f)
    with open(DATA_PATH) as f:
        data = json.load(f)

    buf = build_sdf(
        data,
        schema,
        issuer="Acme Supplies GmbH",
        issuer_id="DE123456789",
        document_type="invoice",
        recipient="Global Logistics AG",
        recipient_id="CH-123.456.789",
    )

    OUTPUT_PATH.write_bytes(buf)
    print(f"Created {OUTPUT_PATH} ({len(buf)} bytes)")


if __name__ == "__main__":
    main()
