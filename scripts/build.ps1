# build.ps1 — build the DeepSeek Harness desktop app.
# Produces (under dist\):
#   DeepSeek Harness\DeepSeek Harness.exe   (unpacked folder app — the main program)
#   DeepSeek-Harness-Setup.exe              (NSIS installer)
#   DeepSeek-Harness-Portable.exe           (single-file portable)
#   DeepSeek-Harness-Portable\              (portable folder, fast-start alternative)
param(
  [switch]$SkipIcon,
  [switch]$SkipInstall
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$launcher = Join-Path $root 'launcher'
$dist = Join-Path $root 'dist'
$out = Join-Path $root 'build\electron-out'
$appFolder = Join-Path $dist 'DeepSeek Harness'
$portableFolder = Join-Path $dist 'DeepSeek-Harness-Portable'

Write-Host '==> [1/4] icons'
if (-not $SkipIcon) {
  Push-Location $root
  node scripts\make-icon.js
  if ($LASTEXITCODE -ne 0) { throw 'make-icon failed' }
  Copy-Item "$root\assets\whale-256.png" "$launcher\renderer\whale.png" -Force
  Pop-Location
}

Write-Host '==> [2/4] node_modules'
if (-not $SkipInstall) {
  Push-Location $launcher
  npm install --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }
  Pop-Location
}

Write-Host '==> [3/4] electron-builder'
Push-Location $launcher
npx electron-builder --win
if ($LASTEXITCODE -ne 0) { throw 'electron-builder failed' }
Pop-Location

Write-Host '==> [4/4] assemble dist'
# unpacked folder app
if (Test-Path $appFolder) { Remove-Item $appFolder -Recurse -Force }
Copy-Item (Join-Path $out 'win-unpacked') $appFolder -Recurse -Force
# portable folder = copy of the unpacked app (fast-start portable alternative)
if (Test-Path $portableFolder) { Remove-Item $portableFolder -Recurse -Force }
Copy-Item (Join-Path $out 'win-unpacked') $portableFolder -Recurse -Force

Write-Host ''
Write-Host '===== BUILD RESULTS ====='
Get-ChildItem $dist -Recurse -File | Where-Object { $_.Extension -in '.exe','.zip' -or $_.Name -eq 'DeepSeek Harness.exe' } | ForEach-Object {
  '{0}  ({1:N1} MB)' -f $_.FullName, ($_.Length / 1MB)
}
Get-ChildItem $appFolder -Filter '*.exe' | ForEach-Object {
  '{0}  ({1:N1} MB)' -f $_.FullName, ($_.Length / 1MB)
}
