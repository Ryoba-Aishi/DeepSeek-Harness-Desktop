# update-dsh.ps1 — update the DSH engine bundled inside the desktop app, then rebuild.
#
# This is the "Harness 本体更新" path: it fetches the latest @deepseek-ai/dsh from
# npm into a fresh temp install, replaces runtime\dsh (the engine bundled in the
# EXE), and rebuilds the desktop app. The Electron launcher code is untouched.
#
# Requires: Node.js + npm on THIS machine (only needed to rebuild, not to run the EXE).
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\update-dsh.ps1 [-Version 0.1.0-rc.7] [-SkipBuild]
param(
  [string]$Version = 'latest',
  [switch]$SkipBuild
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$fresh = Join-Path $root 'build\dsh-fresh'
$target = Join-Path $root 'runtime\dsh'

Write-Host "==> Fetching @deepseek-ai/dsh@$Version from npm ..."
if (Test-Path $fresh) { Remove-Item $fresh -Recurse -Force }
New-Item -ItemType Directory -Path $fresh -Force | Out-Null
npm install --prefix $fresh "@deepseek-ai/dsh@$Version" --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }

$installed = (Get-Content (Join-Path $fresh 'node_modules\@deepseek-ai\dsh\package.json') -Raw | ConvertFrom-Json).version
Write-Host "==> Fetched dsh $installed"

# Backup the previous engine so a failed build can be rolled back.
$backup = Join-Path $root 'build\dsh-backup'
if (Test-Path $backup) { Remove-Item $backup -Recurse -Force }
if (Test-Path $target) {
  Write-Host '==> Backing up current engine ...'
  Move-Item $target $backup
}

Write-Host '==> Installing engine into runtime\dsh ...'
Move-Item (Join-Path $fresh 'node_modules') (Join-Path $target 'node_modules')
Copy-Item (Join-Path $fresh 'package.json') (Join-Path $target 'package.json') -Force
Copy-Item (Join-Path $fresh 'package-lock.json') (Join-Path $target 'package-lock.json') -Force
Remove-Item $fresh -Recurse -Force

Write-Host "==> Engine updated to $installed"
if (-not $SkipBuild) {
  Write-Host '==> Rebuilding desktop app ...'
  & (Join-Path $PSScriptRoot 'build.ps1')
  if ($LASTEXITCODE -ne 0) {
    Write-Host 'BUILD FAILED — restoring previous engine'
    Remove-Item $target -Recurse -Force
    Move-Item $backup $target
    throw 'build failed, engine restored'
  }
  Remove-Item $backup -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Host "==> Done. dsh $installed is now bundled."
