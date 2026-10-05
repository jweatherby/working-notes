@echo off
rem Wonos plugin launcher for Windows: what scripts/wono does elsewhere.
rem   cmd /d /c <plugin>\scripts\wono.cmd mcp
rem It runs, in order of preference:
rem   1. the clone named by %WONO_HOME%, or recorded in <data dir>\app-path
rem   2. the release binary in <plugin>\server, installed into <data dir>\App\<version>
rem      with App\current pointing at it, so updating the plugin never has to replace
rem      a running .exe
setlocal EnableExtensions
set "data=%LOCALAPPDATA%\Wonos"
if "%LOCALAPPDATA%"=="" set "data=%USERPROFILE%\AppData\Local\Wonos"
set "plugin=%~dp0.."
set "setup=Install the Wonos plugin from a release, which includes the app, or clone the Wonos repo and run `bun install` in the clone."

set "app=%WONO_HOME%"
if not defined app set "app=%WORKING_NOTES_HOME%"
if not defined app if exist "%data%\app-path" set /p app=<"%data%\app-path"
rem Before the rename to Wonos. The app moves its data from there on first run.
if not defined app if exist "%data%\..\Working Notes\app-path" set /p app=<"%data%\..\Working Notes\app-path"
if defined app if exist "%app%\node_modules\" goto clone
set "app="

set "bundled=%plugin%\server\wono-windows-x64.exe"
if not exist "%bundled%" goto missing
set /p version=<"%plugin%\server\VERSION"
set "dest=%data%\App\%version%"
if exist "%dest%\wono.exe" goto run
set "staging=%data%\App\.install-%version%-%RANDOM%"
if exist "%staging%" rmdir /s /q "%staging%"
mkdir "%staging%\migrations" || exit /b 1
copy /y /b "%bundled%" "%staging%\wono.exe" >nul || exit /b 1
xcopy /e /i /q /y "%plugin%\server\migrations" "%staging%\migrations" >nul || exit /b 1
copy /y "%plugin%\server\VERSION" "%staging%\VERSION" >nul || exit /b 1
rem Another start may have installed this version meanwhile.
if exist "%dest%\wono.exe" (rmdir /s /q "%staging%") else (move "%staging%" "%dest%" >nul || exit /b 1)

:run
rem App\current is a directory junction, which needs no administrator rights.
if exist "%data%\App\current" rmdir "%data%\App\current"
mklink /J "%data%\App\current" "%dest%" >nul 2>&1
"%dest%\wono.exe" %*
exit /b %ERRORLEVEL%

:clone
set "bun=%WONO_BUN%"
if not defined bun set "bun=%WNOTES_BUN%"
if not defined bun for %%B in (bun.exe) do set "bun=%%~$PATH:B"
if not defined bun if exist "%USERPROFILE%\.bun\bin\bun.exe" set "bun=%USERPROFILE%\.bun\bin\bun.exe"
if not defined bun (
  echo Wonos needs Bun ^(https://bun.sh^), and it isn't on PATH. 1>&2
  exit /b 1
)
"%bun%" "%app%\cli\clone-entry.ts" %*
exit /b %ERRORLEVEL%

:missing
if exist "%plugin%\server\" (
  echo This Wonos plugin has no build for Windows. Download wonos-^<version^>-windows-x64.zip from https://github.com/jweatherby/working-notes/releases/latest and add it as a plugin, or install the desktop app. 1>&2
) else (
  echo Wonos isn't set up on this computer. %setup% 1>&2
)
exit /b 1
