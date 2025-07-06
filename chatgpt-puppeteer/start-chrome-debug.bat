@echo off
echo Killing any existing Chrome processes...
taskkill /F /IM chrome.exe /T 2>nul
timeout /t 2 /nobreak >nul

echo Starting Chrome with debugging on port 9222...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%TEMP%\chrome-debug"

echo.
echo Chrome should now be running with debugging enabled.
echo You should see "DevTools listening on ws://..." message.
echo.
echo Run this in WSL to test: curl http://localhost:9222/json/version
pause