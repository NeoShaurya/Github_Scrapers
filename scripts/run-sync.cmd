@echo off
REM ============================================================================
REM GitHub Scrapers & OpenClaw Auto-Sync Runner (Batch)
REM Runs repository scraping, README hashing, asset extraction, and portfolio sync
REM ============================================================================

cd /d "%~dp0\.."
echo [github-scrapers] Running autonomous portfolio sync...
node bin/cli.js sync %*
if %ERRORLEVEL% NEQ 0 (
    echo [github-scrapers] Sync encountered an error.
    exit /b %ERRORLEVEL%
)
echo [github-scrapers] Sync finished successfully.
