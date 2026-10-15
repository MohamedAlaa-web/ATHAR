@echo off
REM ATHAR preview launcher - double-click to run the site locally.
cd /d "%~dp0"
echo ============================================
echo  ATHAR - starting local preview server...
echo  The site will open in your browser.
echo  To stop: close the "ATHAR server" window.
echo ============================================
start "ATHAR server" /min cmd /c "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort"
timeout /t 4 /nobreak >nul
start "" "http://127.0.0.1:4173/"
echo Site opened at http://127.0.0.1:4173/
pause
