# ─── SDF Windows Integration — Install Script ────────────────────────────────
# Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
# Registers .sdf as a known file type on Windows and optionally
# installs the SDF Shell Extension for thumbnail support.
#
# Run as Administrator in PowerShell:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\install-windows.ps1
#
# Options:
#   -RegistryOnly    Only apply registry entries, skip shell extension
#   -Uninstall       Remove all SDF registrations

param(
  [switch]$RegistryOnly = $false,
  [switch]$Uninstall    = $false
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "  SDF — Windows Integration Installer" -ForegroundColor White
Write-Host "  ────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""

# ── Check admin ───────────────────────────────────────────────────────────────

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (-not $isAdmin) {
  Write-Host "  ✗  This script must be run as Administrator" -ForegroundColor Red
  Write-Host "     Right-click PowerShell → Run as Administrator" -ForegroundColor DarkGray
  exit 1
}

# ── Uninstall ─────────────────────────────────────────────────────────────────

if ($Uninstall) {
  Write-Host "  → Removing SDF file type registrations..." -ForegroundColor Yellow

  $regPaths = @(
    "HKCR:\.sdf",
    "HKCR:\SDFDocument",
    "HKLM:\SOFTWARE\Classes\MIME\Database\Content Type\application/vnd.sdf",
    "HKLM:\SOFTWARE\Classes\.sdf",
    "HKLM:\SOFTWARE\Etapsky"
  )

  foreach ($path in $regPaths) {
    if (Test-Path $path) {
      Remove-Item -Path $path -Recurse -Force
      Write-Host "  ✓  Removed: $path" -ForegroundColor Green
    }
  }

  # Refresh Windows Explorer
  Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
  Start-Process explorer

  Write-Host ""
  Write-Host "  ✓  SDF integration uninstalled" -ForegroundColor Green
  exit 0
}

# ── Apply registry entries ────────────────────────────────────────────────────

Write-Host "  → Applying registry entries..." -ForegroundColor Cyan

$regFile = Join-Path $PSScriptRoot "sdf-association.reg"

if (-not (Test-Path $regFile)) {
  Write-Host "  ✗  sdf-association.reg not found at: $regFile" -ForegroundColor Red
  exit 1
}

$result = Start-Process "reg.exe" -ArgumentList "import `"$regFile`"" -Wait -PassThru -NoNewWindow
if ($result.ExitCode -ne 0) {
  Write-Host "  ✗  Registry import failed (exit code: $($result.ExitCode))" -ForegroundColor Red
  exit 1
}

Write-Host "  ✓  Registry entries applied" -ForegroundColor Green

# ── Verify Node.js / npx available ───────────────────────────────────────────

Write-Host "  → Checking Node.js / npx..." -ForegroundColor Cyan
try {
  $nodeVersion = & node --version 2>&1
  $npxVersion  = & npx --version 2>&1
  Write-Host "  ✓  Node.js $nodeVersion · npx $npxVersion" -ForegroundColor Green
} catch {
  Write-Host "  ⚠  Node.js not found — right-click menu items require Node.js" -ForegroundColor Yellow
  Write-Host "     Install from: https://nodejs.org" -ForegroundColor DarkGray
}

# ── Verify sdf-cli available ──────────────────────────────────────────────────

Write-Host "  → Checking @etapsky/sdf-cli..." -ForegroundColor Cyan
try {
  $cliVersion = & npx @etapsky/sdf-cli --version 2>&1
  Write-Host "  ✓  sdf-cli $cliVersion" -ForegroundColor Green
} catch {
  Write-Host "  ⚠  @etapsky/sdf-cli not installed globally" -ForegroundColor Yellow
  Write-Host "     Install with: npm install -g @etapsky/sdf-cli" -ForegroundColor DarkGray
}

# ── Refresh Windows Explorer ──────────────────────────────────────────────────

Write-Host "  → Refreshing Windows Explorer..." -ForegroundColor Cyan
$null = [System.Runtime.InteropServices.Marshal]::ReleaseComObject(
  [System.Runtime.InteropServices.Marshal]::GetActiveObject("Shell.Application")
) 2>$null

# Notify shell of file association change
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Shell {
  [DllImport("shell32.dll")]
  public static extern void SHChangeNotify(int eventId, uint flags, IntPtr item1, IntPtr item2);
}
"@
[Shell]::SHChangeNotify(0x08000000, 0x0000, [IntPtr]::Zero, [IntPtr]::Zero)

Write-Host "  ✓  Shell notified of file type change" -ForegroundColor Green

# ── Test ──────────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "  → Testing with assoc command..."
$assoc = & cmd /c "assoc .sdf" 2>&1
Write-Host "     $assoc" -ForegroundColor DarkGray

$ftype = & cmd /c "ftype SDFDocument" 2>&1
Write-Host "     $ftype" -ForegroundColor DarkGray

# ── Summary ───────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "  ────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host "  ✓  Windows SDF integration installed" -ForegroundColor Green
Write-Host ""
Write-Host "  What was registered:" -ForegroundColor White
Write-Host "  · .sdf → Smart Document Format (MIME: application/vnd.sdf)" -ForegroundColor DarkGray
Write-Host "  · Right-click → Inspect with SDF CLI" -ForegroundColor DarkGray
Write-Host "  · Right-click → Validate SDF" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor White
Write-Host "  · Install SDF Reader app for double-click open support" -ForegroundColor DarkGray
Write-Host "  · Install @etapsky/sdf-cli globally for right-click menu" -ForegroundColor DarkGray
Write-Host "    npm install -g @etapsky/sdf-cli" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  To uninstall: .\install-windows.ps1 -Uninstall" -ForegroundColor DarkGray
Write-Host ""