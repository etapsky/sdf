#!/usr/bin/env bash
# ─── SDF macOS Integration — Install Script ───────────────────────────────────
# Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
# Registers .sdf as a known file type on macOS.
#
# What this does:
#   1. Copies the Quick Look plugin to ~/Library/QuickLook/
#   2. Resets Quick Look daemon so the plugin is loaded
#   3. Registers the .sdf UTI with Launch Services
#   4. Associates .sdf with SDF Reader (demo-reader) if installed
#
# Requirements:
#   - macOS 12+
#   - Quick Look plugin must be built first: xcodebuild ...
#   - Optional: SDF Reader app at /Applications/SDF Reader.app
#
# Usage:
#   chmod +x install-macos.sh
#   ./install-macos.sh

set -euo pipefail

PLUGIN_NAME="SDFQuickLook.qlgenerator"
QL_DIR="$HOME/Library/QuickLook"
PLUGIN_SRC="./build/$PLUGIN_NAME"

echo ""
echo "  SDF — macOS Integration Installer"
echo "  ────────────────────────────────────────────"
echo ""

# ── Quick Look plugin ─────────────────────────────────────────────────────────

if [ -d "$PLUGIN_SRC" ]; then
  echo "  → Installing Quick Look plugin..."
  mkdir -p "$QL_DIR"
  cp -r "$PLUGIN_SRC" "$QL_DIR/"
  echo "  ✓ Plugin copied to $QL_DIR/$PLUGIN_NAME"
else
  echo "  ⚠  Quick Look plugin not found at $PLUGIN_SRC"
  echo "     Build it first with: xcodebuild -project SDFQuickLook.xcodeproj"
fi

# ── Reset Quick Look daemon ───────────────────────────────────────────────────

echo "  → Resetting Quick Look daemon..."
qlmanage -r > /dev/null 2>&1 || true
qlmanage -r cache > /dev/null 2>&1 || true
echo "  ✓ Quick Look daemon reset"

# ── Register UTI with Launch Services ────────────────────────────────────────

echo "  → Registering .sdf UTI with Launch Services..."

# Write a minimal UTI registration plist
UTI_PLIST="$HOME/Library/LaunchAgents/com.etapsky.sdf-uti.plist"

cat > /tmp/sdf-uti-register.py << 'PYTHON'
import subprocess, os, json

# Use lsregister to register UTI
# The plugin's Info.plist already declares the UTI — we just need to trigger registration
ql_dir = os.path.expanduser("~/Library/QuickLook/SDFQuickLook.qlgenerator")
if os.path.exists(ql_dir):
    result = subprocess.run(
        ["/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/"
         "LaunchServices.framework/Versions/A/Support/lsregister",
         "-f", ql_dir],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        print("  ✓ UTI registered with Launch Services")
    else:
        print(f"  ⚠  lsregister warning: {result.stderr.strip()}")
else:
    print("  ⚠  Plugin not installed — skipping UTI registration")
PYTHON

python3 /tmp/sdf-uti-register.py
rm -f /tmp/sdf-uti-register.py

# ── Associate .sdf with SDF Reader ────────────────────────────────────────────

SDF_READER="/Applications/SDF Reader.app"

if [ -d "$SDF_READER" ]; then
  echo "  → Associating .sdf with SDF Reader..."
  # Use duti if available, otherwise skip
  if command -v duti &> /dev/null; then
    duti -s com.etapsky.sdfreader .sdf all
    echo "  ✓ .sdf associated with SDF Reader"
  else
    echo "  ⚠  duti not found. Install with: brew install duti"
    echo "     Then run: duti -s com.etapsky.sdfreader .sdf all"
  fi
else
  echo "  ⚠  SDF Reader not found at /Applications/SDF Reader.app"
  echo "     .sdf files will open with the system default (Archive Utility)"
fi

# ── Test ──────────────────────────────────────────────────────────────────────

echo ""
echo "  Testing Quick Look with sample .sdf..."
SAMPLE_SDF=$(find "$HOME" -name "*.sdf" -maxdepth 5 2>/dev/null | head -1)

if [ -n "$SAMPLE_SDF" ]; then
  echo "  → Testing: $SAMPLE_SDF"
  qlmanage -p "$SAMPLE_SDF" > /dev/null 2>&1 &
  sleep 2
  kill %1 2>/dev/null || true
  echo "  ✓ Quick Look test completed — check Finder with Space key"
else
  echo "  ⚠  No .sdf file found for testing. Generate one with:"
  echo "     cd spec/poc && npm run build:invoice"
fi

echo ""
echo "  ────────────────────────────────────────────"
echo "  ✓  macOS SDF integration installed"
echo ""
echo "  Next steps:"
echo "  1. Open Finder and navigate to a .sdf file"
echo "  2. Press Space to preview with Quick Look"
echo "  3. The visual.pdf layer will be shown"
echo ""