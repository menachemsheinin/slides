@echo off
rem Presenting launcher. Works on any Windows computer, no installation needed.
rem Order: Python (if installed) -> built-in PowerShell server -> plain file open.
cd /d "%~dp0"

python -c "import sys" >nul 2>nul
if not errorlevel 1 goto usepython
py -c "import sys" >nul 2>nul
if not errorlevel 1 goto usepy
goto usepowershell

:usepython
echo Starting slides with Python...
start "" http://localhost:8030
python serve.py
goto end

:usepy
echo Starting slides with Python...
start "" http://localhost:8030
py serve.py
goto end

:usepowershell
echo Python was not found. Using the built-in PowerShell server...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1" -Port 8030
if not errorlevel 1 goto end

echo.
echo The local server could not start. Opening the slides directly from the file.
echo (YouTube videos will not play in this mode. Everything else works.)
start "" "%~dp0index.html"

:end
pause
