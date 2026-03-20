#!/usr/bin/env bash
# ─── register-icon.sh ────────────────────────────────────────────────────────
# Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
#
# Registers the .sdf file type icon on macOS WITHOUT Xcode.
# Creates a minimal UTI registration bundle in ~/Library/ and tells
# Launch Services + Finder about it.
#
# Requirements: none (pure shell + macOS built-ins)
#
# Usage:
#   chmod +x register-icon.sh
#   ./register-icon.sh
#
# Uninstall:
#   ./register-icon.sh --uninstall

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ICNS_SRC="$SCRIPT_DIR/SDFDocument.icns"
BUNDLE="$HOME/Library/SDFFileType.app"
LSREG="/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister"

# ── Uninstall ─────────────────────────────────────────────────────────────────

if [[ "${1:-}" == "--uninstall" ]]; then
  echo "  → Unregistering .sdf icon..."
  if [ -d "$BUNDLE" ]; then
    "$LSREG" -u "$BUNDLE" 2>/dev/null || true
    rm -rf "$BUNDLE"
    echo "  ✓ Bundle removed"
  fi
  /System/Library/CoreServices/Finder.app/Contents/MacOS/Finder &>/dev/null &
  killall Finder 2>/dev/null || true
  echo "  ✓ Finder restarted"
  echo "  ✓ Uninstall complete"
  exit 0
fi

# ── Check prerequisites ───────────────────────────────────────────────────────

echo ""
echo "  SDF — macOS icon registration (no Xcode required)"
echo "  ─────────────────────────────────────────────────"
echo ""

if [ ! -f "$ICNS_SRC" ]; then
  echo "  ERROR: SDFDocument.icns not found."
  echo "         Run first: python3 generate-icon.py"
  exit 1
fi

if [ ! -f "$LSREG" ]; then
  echo "  ERROR: lsregister not found (unexpected on macOS 12+)."
  exit 1
fi

# ── Build minimal registration bundle ────────────────────────────────────────
# macOS reads UTExportedTypeDeclarations from ANY bundle's Info.plist.
# We create a minimal .app with a dummy executable so lsregister accepts it.

echo "  → Creating registration bundle at $BUNDLE"

mkdir -p "$BUNDLE/Contents/MacOS"
mkdir -p "$BUNDLE/Contents/Resources"

# Dummy executable (empty shell script — macOS only checks it's executable)
cat > "$BUNDLE/Contents/MacOS/SDFFileType" << 'SH'
#!/bin/sh
SH
chmod +x "$BUNDLE/Contents/MacOS/SDFFileType"

# Icon
cp "$ICNS_SRC" "$BUNDLE/Contents/Resources/SDFDocument.icns"
echo "  ✓ Icon copied ($(du -sh "$BUNDLE/Contents/Resources/SDFDocument.icns" | cut -f1))"

# Info.plist — declares the com.etapsky.sdf UTI and associates the icon
cat > "$BUNDLE/Contents/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key>
  <string>com.etapsky.sdf-filetype</string>

  <key>CFBundleName</key>
  <string>SDF File Type</string>

  <key>CFBundleExecutable</key>
  <string>SDFFileType</string>

  <key>CFBundleShortVersionString</key>
  <string>1.0.0</string>

  <key>CFBundleVersion</key>
  <string>1</string>

  <key>CFBundlePackageType</key>
  <string>APPL</string>

  <key>LSUIElement</key>
  <true/>

  <!-- Register the .sdf document type with our icon -->
  <key>CFBundleDocumentTypes</key>
  <array>
    <dict>
      <key>CFBundleTypeExtensions</key>
      <array><string>sdf</string></array>

      <key>CFBundleTypeMIMETypes</key>
      <array><string>application/vnd.sdf</string></array>

      <key>CFBundleTypeName</key>
      <string>Smart Document Format</string>

      <key>CFBundleTypeIconFile</key>
      <string>SDFDocument</string>

      <key>CFBundleTypeRole</key>
      <string>Viewer</string>

      <key>LSTypeIsPackage</key>
      <false/>
    </dict>
  </array>

  <!-- Export the UTI so other apps can reference it -->
  <key>UTExportedTypeDeclarations</key>
  <array>
    <dict>
      <key>UTTypeIdentifier</key>
      <string>com.etapsky.sdf</string>

      <key>UTTypeDescription</key>
      <string>Smart Document Format</string>

      <key>UTTypeConformsTo</key>
      <array>
        <string>public.data</string>
        <string>public.archive</string>
      </array>

      <key>UTTypeTagSpecification</key>
      <dict>
        <key>public.filename-extension</key>
        <array><string>sdf</string></array>
        <key>public.mime-type</key>
        <array><string>application/vnd.sdf</string></array>
      </dict>

      <key>UTTypeIconFile</key>
      <string>SDFDocument</string>
    </dict>
  </array>
</dict>
</plist>
PLIST

echo "  ✓ Info.plist written"

# ── Register with Launch Services ─────────────────────────────────────────────

echo "  → Registering with Launch Services..."
"$LSREG" -f "$BUNDLE"
echo "  ✓ Registered"

# ── Flush icon cache & restart Finder ─────────────────────────────────────────

echo "  → Flushing icon cache..."
# Remove Finder's icon cache (requires no sudo)
find "$HOME/Library/Caches/com.apple.finder" -name "*.iconcache" -delete 2>/dev/null || true
rm -rf "$HOME/Library/Caches/com.apple.iconservices.store" 2>/dev/null || true

echo "  → Restarting Finder..."
killall Finder 2>/dev/null || true
sleep 1

echo ""
echo "  ─────────────────────────────────────────────────"
echo "  ✓  Done. Open Finder — .sdf files now show the SDF icon."
echo ""
echo "  Note: If the icon doesn't appear immediately, wait a few"
echo "        seconds or move the .sdf file to trigger a refresh."
echo ""
echo "  Uninstall: ./register-icon.sh --uninstall"
echo ""
