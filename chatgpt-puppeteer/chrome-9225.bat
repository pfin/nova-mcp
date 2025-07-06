@echo off
echo Closing any existing Chrome...
taskkill /F /IM chrome.exe 2>nul
timeout /t 2 >nul

echo Starting Chrome with debug port 9225...
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9225

echo Chrome started. Check if you see "DevTools listening" message above.