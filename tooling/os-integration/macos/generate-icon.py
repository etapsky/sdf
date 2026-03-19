#!/usr/bin/env python3
# ─── generate-icon.py ────────────────────────────────────────────────────────
# Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
# Generates SDFDocument.icns for macOS and SDFDocument.ico for Windows.
#
# Requires: Pillow
#   pip install Pillow
#
# Usage:
#   python3 generate-icon.py
#
# Output:
#   SDFDocument.icns   → copy into .qlgenerator bundle Resources/
#   SDFDocument.ico    → copy to Windows app resources/

import os
import sys
import struct
import io

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Pillow required: pip install Pillow")
    sys.exit(1)

# ─── Icon design ──────────────────────────────────────────────────────────────
# White document with folded top-right corner, amber→purple left bar, "SDF" text

AMBER  = (245, 158, 11,  255)   # #F59E0B
PURPLE = (124, 58,  237, 255)   # #7C3AED
WHITE  = (255, 255, 255, 255)
DARK   = (26,  26,  26,  255)
SHADOW = (0,   0,   0,   30)

def draw_sdf_icon(size: int) -> Image.Image:
    img  = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    pad    = int(size * 0.08)
    fold   = int(size * 0.22)
    radius = int(size * 0.06)

    # Document body (white rounded rect with folded corner)
    doc_left   = pad
    doc_top    = pad
    doc_right  = size - pad
    doc_bottom = size - pad
    fold_x     = doc_right - fold
    fold_y     = doc_top + fold

    # Draw document polygon (with folded corner cutout)
    poly = [
        (doc_left + radius, doc_top),
        (fold_x,            doc_top),
        (doc_right,         fold_y),
        (doc_right,         doc_bottom - radius),
        (doc_right - radius, doc_bottom),
        (doc_left + radius, doc_bottom),
        (doc_left,          doc_bottom - radius),
        (doc_left,          doc_top + radius),
    ]
    draw.polygon(poly, fill=WHITE)

    # Folded corner triangle (light gray)
    fold_poly = [
        (fold_x,   doc_top),
        (doc_right, fold_y),
        (fold_x,   fold_y),
    ]
    draw.polygon(fold_poly, fill=(240, 240, 240, 255))

    # Left accent bar — gradient simulation (amber top → purple bottom)
    bar_w = max(int(size * 0.07), 4)
    bar_x = doc_left
    for y in range(doc_top, doc_bottom):
        t = (y - doc_top) / (doc_bottom - doc_top)
        r = int(AMBER[0] * (1 - t) + PURPLE[0] * t)
        g = int(AMBER[1] * (1 - t) + PURPLE[1] * t)
        b = int(AMBER[2] * (1 - t) + PURPLE[2] * t)
        draw.line([(bar_x, y), (bar_x + bar_w, y)], fill=(r, g, b, 255))

    # "SDF" text
    font_size = max(int(size * 0.22), 8)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except Exception:
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
        except Exception:
            font = ImageFont.load_default()

    text    = "SDF"
    bbox    = draw.textbbox((0, 0), text, font=font)
    text_w  = bbox[2] - bbox[0]
    text_h  = bbox[3] - bbox[1]
    text_x  = bar_x + bar_w + int(size * 0.06)
    text_y  = (size - text_h) // 2 - int(size * 0.02)
    draw.text((text_x, text_y), text, font=font, fill=DARK)

    return img


# ─── ICNS builder ─────────────────────────────────────────────────────────────

ICNS_SIZES = {
    16:  (b'icp4', b'icp4'),
    32:  (b'icp5', b'icp5'),
    64:  (b'icp6', b'icp6'),
    128: (b'ic07', b'ic07'),
    256: (b'ic08', b'ic08'),
    512: (b'ic09', b'ic09'),
    1024:(b'ic10', b'ic10'),
}

def build_icns(images: dict) -> bytes:
    chunks = []
    for size, img in images.items():
        if size not in ICNS_SIZES:
            continue
        icon_type = ICNS_SIZES[size][0]
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        png_data = buf.getvalue()
        chunk_size = 8 + len(png_data)
        chunks.append(icon_type + struct.pack('>I', chunk_size) + png_data)

    body     = b''.join(chunks)
    total    = 8 + len(body)
    return b'icns' + struct.pack('>I', total) + body


# ─── ICO builder ──────────────────────────────────────────────────────────────

def build_ico(images: dict) -> bytes:
    # Windows ICO format — sizes 16, 32, 48, 64, 128, 256
    ico_sizes = [s for s in [16, 32, 48, 64, 128, 256] if s in images]
    entries   = []
    png_blobs = []

    for size in ico_sizes:
        img = images[size]
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        png_data = buf.getvalue()
        png_blobs.append(png_data)

        w = size if size < 256 else 0
        h = size if size < 256 else 0
        entries.append((w, h, 0, 0, 1, 32, len(png_data)))

    header_size  = 6 + len(ico_sizes) * 16
    data_offset  = header_size
    offsets      = []
    for blob in png_blobs:
        offsets.append(data_offset)
        data_offset += len(blob)

    out = struct.pack('<HHH', 0, 1, len(ico_sizes))
    for i, (w, h, cc, rc, planes, bpp, sz) in enumerate(entries):
        out += struct.pack('<BBBBHHII', w, h, cc, rc, planes, bpp, sz, offsets[i])

    for blob in png_blobs:
        out += blob

    return out


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    output_dir = os.path.dirname(os.path.abspath(__file__))
    sizes      = [16, 32, 48, 64, 128, 256, 512, 1024]

    print("  Generating SDF icons...")
    images = {}
    for size in sizes:
        images[size] = draw_sdf_icon(size)
        print(f"  ✓  {size}×{size}")

    # ICNS
    icns_path = os.path.join(output_dir, "SDFDocument.icns")
    with open(icns_path, 'wb') as f:
        f.write(build_icns(images))
    print(f"  ✓  {icns_path}")

    # ICO
    ico_path = os.path.join(output_dir, "SDFDocument.ico")
    with open(ico_path, 'wb') as f:
        f.write(build_ico(images))
    print(f"  ✓  {ico_path}")

    # Also save individual PNGs for reference
    png_dir = os.path.join(output_dir, "icon-pngs")
    os.makedirs(png_dir, exist_ok=True)
    for size, img in images.items():
        img.save(os.path.join(png_dir, f"SDFDocument_{size}x{size}.png"))
    print(f"  ✓  PNG previews saved to {png_dir}/")

    print("")
    print("  Done. Copy files to:")
    print("  macOS: SDFDocument.icns → SDFQuickLook.qlgenerator/Contents/Resources/")
    print("  Win:   SDFDocument.ico  → SDF Reader/resources/")

if __name__ == "__main__":
    main()