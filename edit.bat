@echo off
rem Editor launcher. Editing and saving need Python. To only present, use present.bat.
cd /d "%~dp0"

python -c "import sys" >nul 2>nul
if not errorlevel 1 goto usepython
py -c "import sys" >nul 2>nul
if not errorlevel 1 goto usepy

echo Editing needs Python, and it was not found on this computer.
echo Install it from https://www.python.org/downloads/ (tick "Add python.exe to PATH"),
echo or run present.bat to present without editing.
goto end

:usepython
echo Slides editor: http://localhost:8030
echo Close this window to stop.
start "" http://localhost:8030
python serve.py
goto end

:usepy
echo Slides editor: http://localhost:8030
echo Close this window to stop.
start "" http://localhost:8030
py serve.py

:end
pause
