@echo off
rem Working Notes plugin launcher for Windows: what scripts/wnotes does elsewhere.
rem   cmd /d /c <plugin>\scripts\wnotes.cmd mcp
rem It runs, in order of preference:
rem   1. the clone named by %WORKING_NOTES_HOME%, or recorded in <data dir>\app-path
rem   2. the release binary in <plugin>\server, installed into <data dir>\App\<version>
rem      with App\current pointing at it, so updating the plugin never has to replace
rem      a running .exe
setlocal EnableExtensions
set "data=%LOCALAPPDATA%\Working Notes"
if "%LOCALAPPDATA%"=="" set "data=%USERPROFILE%\AppData\Local\Working Notes"
set "plugin=%~dp0.."
set "setup=Install the Working Notes plugin from a release, which includes the app, or clone the Working Notes repo and run `bun install` in the clone."

set "app=%WORKING_NOTES_HOME%"
if not defined app if exist "%data%\app-path" set /p app=<"%data%\app-path"
if defined app if exist "%app%\node_modules\" goto clone
set "app="

set "bundled=%plugin%\server\wnotes-windows-x64.exe"
if not exist "%bundled%" goto missing
set /p version=<"%plugin%\server\VERSION"
set "dest=%data%\App\%version%"
if exist "%dest%\wnotes.exe" goto run
set "staging=%data%\App\.install-%version%-%RANDOM%"
if exist "%staging%" rmdir /s /q "%staging%"
mkdir "%staging%\migrations" || exit /b 1
copy /y /b "%bundled%" "%staging%\wnotes.exe" >nul || exit /b 1
xcopy /e /i /q /y "%plugin%\server\migrations" "%staging%\migrations" >nul || exit /b 1
copy /y "%plugin%\server\VERSION" "%staging%\VERSION" >nul || exit /b 1
rem Another start may have installed this version meanwhile.
if exist "%dest%\wnotes.exe" (rmdir /s /q "%staging%") else (move "%staging%" "%dest%" >nul || exit /b 1)

:run
rem App\current is a directory junction, which needs no administrator rights.
if exist "%data%\App\current" rmdir "%data%\App\current"
mklink /J "%data%\App\current" "%dest%" >nul 2>&1
"%dest%\wnotes.exe" %*
exit /b %ERRORLEVEL%

:clone
set "bun=%WNOTES_BUN%"
if not defined bun for %%B in (bun.exe) do set "bun=%%~$PATH:B"
if not defined bun if exist "%USERPROFILE%\.bun\bin\bun.exe" set "bun=%USERPROFILE%\.bun\bin\bun.exe"
if not defined bun (
  echo Working Notes needs Bun ^(https://bun.sh^), and it isn't on PATH. 1>&2
  exit /b 1
)
"%bun%" "%app%\cli\clone-entry.ts" %*
exit /b %ERRORLEVEL%

:missing
if exist "%plugin%\server\" (
  echo This Working Notes release has no build for Windows. %setup% 1>&2
) else (
  echo Working Notes isn't set up on this computer. %setup% 1>&2
)
exit /b 1
