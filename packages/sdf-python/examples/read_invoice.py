#!/usr/bin/env python3
# Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
"""Read and inspect an SDF invoice."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sdf import parse_sdf

REPO_ROOT = Path(__file__).resolve().parents[2]
FIXTURE_PATH = REPO_ROOT / "spec" / "poc" / "output" / "invoice.sdf"


def main() -> None:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else FIXTURE_PATH
    if not path.exists():
        print(f"Usage: python read_invoice.py [path/to/file.sdf]")
        print(f"Default: {FIXTURE_PATH}")
        sys.exit(1)

    buf = path.read_bytes()
    result = parse_sdf(buf)

    print("=== Meta ===")
    print(json.dumps(result.meta.to_dict() if hasattr(result.meta, "to_dict") else result.meta, indent=2))
    print("\n=== Data (summary) ===")
    data = result.data
    if "invoice_number" in data:
        print(f"Invoice: {data.get('invoice_number')}")
    if "totals" in data:
        print(f"Gross: {data['totals'].get('gross', {}).get('amount')} {data['totals'].get('gross', {}).get('currency')}")
    print(f"\nPDF size: {len(result.pdf_bytes)} bytes")


if __name__ == "__main__":
    main()
