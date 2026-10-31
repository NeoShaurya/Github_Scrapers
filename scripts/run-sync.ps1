# ==============================================================================
# GitHub Scrapers & OpenClaw Auto-Sync Runner (PowerShell)
# Automatically syncs GitHub repositories, screenshots, and AI descriptions
# ==============================================================================

param (
    [switch]$Force,
    [switch]$GitPush
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path "$ScriptDir\.."

Set-Location $ProjectRoot

Write-Host "==========================================================" -ForegroundColor Magenta
Write-Host " [GitHub Scrapers] Starting Autonomous Sync" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Magenta

$argsList = @("bin/cli.js", "sync")
if ($Force) { $argsList += "--force" }
if ($GitPush) { $argsList += "--git-push" }

try {
    & node $argsList
    Write-Host "`n[OK] Synchronization completed successfully." -ForegroundColor Green
} catch {
    Write-Host "`n[ERROR] Sync failed: $_" -ForegroundColor Red
    exit 1
}
