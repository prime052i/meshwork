@echo off
setlocal
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 24 or later is required. Install Node.js, reopen your terminal, and try again.
  exit /b 1
)
pushd "%~dp0"
node scripts\workspace.mjs %*
set "MESHWORK_RUN_EXIT=%ERRORLEVEL%"
popd
exit /b %MESHWORK_RUN_EXIT%
