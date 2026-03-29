#!/usr/bin/env python3
# ─── generate-icon.py ────────────────────────────────────────────────────────
# Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
# Generates SDFDocument.icns (macOS) and SDFDocument.ico (Windows)
# by rasterising assets/sdf_icon_v2.svg at all required sizes.
#
# Requires: cairosvg, Pillow
#   pip install cairosvg Pillow
#
# Usage:
#   python3 generate-icon.py
#
# Output:
#   SDFDocument.icns   → copy into .qlgenerator bundle Resources/
#   SDFDocument.ico    → copy to Windows app resources/
#   icon-pngs/         → individual PNGs for reference

import os
import sys
import struct
import io

# ─── Locate SVG source ────────────────────────────────────────────────────────

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SVG_PATH   = os.path.normpath(
    os.path.join(SCRIPT_DIR, "..", "..", "..", "me", "assets", "sdf_icon_v2.svg")
)

if not os.path.exists(SVG_PATH):
    print(f"ERROR: SVG source not found at {SVG_PATH}")
    sys.exit(1)

# ─── Rasteriser ───────────────────────────────────────────────────────────────

try:
    import cairosvg
    def rasterise(size: int) -> bytes:
        """Render SVG → PNG bytes at the given pixel size."""
        return cairosvg.svg2png(
            url=SVG_PATH,
            output_width=size,
            output_height=size,
        )
except ImportError:
    print("cairosvg not found — trying rsvg-convert (brew install librsvg)…")
    import subprocess, shutil
    if not shutil.which("rsvg-convert"):
        print("ERROR: neither cairosvg nor rsvg-convert is available.")
        print("  pip install cairosvg   OR   brew install librsvg")
        sys.exit(1)
    def rasterise(size: int) -> bytes:
        result = subprocess.run(
            ["rsvg-convert", "-w", str(size), "-h", str(size), SVG_PATH],
            capture_output=True, check=True,
        )
        return result.stdout

# ─── ICNS builder ─────────────────────────────────────────────────────────────
# Maps pixel size → OSType icon tag used in the ICNS container.

ICNS_MAP = {
    16:   b'icp4',
    32:   b'icp5',
    64:   b'icp6',
    128:  b'ic07',
    256:  b'ic08',
    512:  b'ic09',
    1024: b'ic10',
}

def build_icns(png_map: dict[int, bytes]) -> bytes:
    chunks = []
    for size, png_data in sorted(png_map.items()):
        tag = ICNS_MAP.get(size)
        if tag is None:
            continue
        chunk_len = 8 + len(png_data)
        chunks.append(tag + struct.pack(">I", chunk_len) + png_data)
    body  = b"".join(chunks)
    total = 8 + len(body)
    return b"icns" + struct.pack(">I", total) + body

# ─── ICO builder ──────────────────────────────────────────────────────────────

ICO_SIZES = [16, 32, 48, 64, 128, 256]

def build_ico(png_map: dict[int, bytes]) -> bytes:
    sizes     = [s for s in ICO_SIZES if s in png_map]
    blobs     = [png_map[s] for s in sizes]

    header_sz = 6 + len(sizes) * 16
    offset    = header_sz
    offsets   = []
    for blob in blobs:
        offsets.append(offset)
        offset += len(blob)

    out = struct.pack("<HHH", 0, 1, len(sizes))
    for i, size in enumerate(sizes):
        w = size if size < 256 else 0
        h = size if size < 256 else 0
        out += struct.pack("<BBBBHHII", w, h, 0, 0, 1, 32, len(blobs[i]), offsets[i])
    for blob in blobs:
        out += blob
    return out

# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    print(f"  Source SVG : {SVG_PATH}")

    # Rasterise at all required sizes
    all_sizes = sorted(set(list(ICNS_MAP.keys()) + ICO_SIZES))
    png_map: dict[int, bytes] = {}
    for size in all_sizes:
        png_map[size] = rasterise(size)
        print(f"  ✓  {size}×{size}")

    # ICNS
    icns_path = os.path.join(SCRIPT_DIR, "SDFDocument.icns")
    with open(icns_path, "wb") as f:
        f.write(build_icns(png_map))
    print(f"\n  ✓  {icns_path}")

    # ICO
    ico_path = os.path.join(SCRIPT_DIR, "SDFDocument.ico")
    with open(ico_path, "wb") as f:
        f.write(build_ico(png_map))
    print(f"  ✓  {ico_path}")

    # Individual PNGs for reference / docs
    png_dir = os.path.join(SCRIPT_DIR, "icon-pngs")
    os.makedirs(png_dir, exist_ok=True)
    for size, data in png_map.items():
        with open(os.path.join(png_dir, f"SDFDocument_{size}x{size}.png"), "wb") as f:
            f.write(data)
    print(f"  ✓  PNG previews → {png_dir}/")

    print("")
    print("  Next steps:")
    print("  macOS : cp SDFDocument.icns <SDFQuickLook.qlgenerator>/Contents/Resources/")
    print("  Win   : copy SDFDocument.ico to SDF Reader resources/")


if __name__ == "__main__":
    main()
