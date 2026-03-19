# ─── test-windows.ps1 ────────────────────────────────────────────────────────
# Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
# Verifies that SDF Windows registry integration is correctly applied.
# Run after install-windows.ps1 to confirm everything works.
#
# Usage (no admin required):
#   .\test-windows.ps1

$ErrorActionPreference = "SilentlyContinue"
$pass = 0
$fail = 0

function Test-Item($label, $condition) {
    if ($condition) {
        Write-Host "  ✓  $label" -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host "  ✗  $label" -ForegroundColor Red
        $script:fail++
    }
}

Write-Host ""
Write-Host "  SDF — Windows Integration Test" -ForegroundColor White
Write-Host "  ────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""

# ── Registry checks ───────────────────────────────────────────────────────────

Write-Host "  Registry" -ForegroundColor Cyan

Test-Item ".sdf extension registered" `
    (Test-Path "HKCR:\.sdf")

Test-Item ".sdf maps to SDFDocument ProgID" `
    ((Get-ItemProperty -Path "HKCR:\.sdf" -Name "(default)" -ErrorAction SilentlyContinue)."(default)" -eq "SDFDocument")

Test-Item "SDFDocument friendly name set" `
    (Test-Path "HKCR:\SDFDocument")

Test-Item "SDFDocument open command set" `
    (Test-Path "HKCR:\SDFDocument\shell\open\command")

Test-Item "Inspect with SDF CLI menu item" `
    (Test-Path "HKCR:\SDFDocument\shell\inspect\command")

Test-Item "Validate SDF menu item" `
    (Test-Path "HKCR:\SDFDocument\shell\validate\command")

Test-Item "MIME type registered" `
    (Test-Path "HKLM:\SOFTWARE\Classes\MIME\Database\Content Type\application/vnd.sdf")

Test-Item "Etapsky app registration" `
    (Test-Path "HKLM:\SOFTWARE\Etapsky\SDF Reader\Capabilities")

Write-Host ""

# ── assoc / ftype checks ──────────────────────────────────────────────────────

Write-Host "  Shell association" -ForegroundColor Cyan

$assoc = & cmd /c "assoc .sdf" 2>&1
Test-Item ".sdf assoc: $assoc" ($assoc -like "*.sdf=SDFDocument*")

$ftype = & cmd /c "ftype SDFDocument" 2>&1
Test-Item "SDFDocument ftype set" ($ftype -like "*SDFDocument*=*")

Write-Host ""

# ── Dependency checks ─────────────────────────────────────────────────────────

Write-Host "  Dependencies" -ForegroundColor Cyan

$node = & node --version 2>&1
Test-Item "Node.js: $node" ($LASTEXITCODE -eq 0)

$npx = & npx --version 2>&1
Test-Item "npx: $npx" ($LASTEXITCODE -eq 0)

$cli = & npx @etapsky/sdf-cli --version 2>&1
Test-Item "@etapsky/sdf-cli: $cli" ($LASTEXITCODE -eq 0)

Write-Host ""

# ── Functional test ───────────────────────────────────────────────────────────

Write-Host "  Functional" -ForegroundColor Cyan

$sdfFile = Get-ChildItem -Path "$env:USERPROFILE" -Filter "*.sdf" -Recurse -ErrorAction SilentlyContinue |
           Select-Object -First 1

if ($sdfFile) {
    Write-Host "  → Testing with: $($sdfFile.FullName)" -ForegroundColor DarkGray
    $result = & npx @etapsky/sdf-cli validate "$($sdfFile.FullName)" --quiet 2>&1
    Test-Item "sdf validate exit 0" ($LASTEXITCODE -eq 0)
} else {
    Write-Host "  ⚠  No .sdf file found — skipping functional test" -ForegroundColor Yellow
    Write-Host "     Generate one: npx @etapsky/sdf-cli convert --data d.json --schema s.json --issuer X --out test.sdf" -ForegroundColor DarkGray
}

Write-Host ""

# ── Summary ───────────────────────────────────────────────────────────────────

Write-Host "  ────────────────────────────────────────────" -ForegroundColor DarkGray
$total = $pass + $fail
if ($fail -eq 0) {
    Write-Host "  ✓  All $total checks passed" -ForegroundColor Green
} else {
    Write-Host "  ✗  $fail of $total checks failed" -ForegroundColor Red
    Write-Host "     Run install-windows.ps1 as Administrator to fix" -ForegroundColor DarkGray
}
Write-Host ""