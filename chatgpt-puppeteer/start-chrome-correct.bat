@echo off
echo Starting Chrome with debugging on port 9222...
echo.

REM Option 1: Use your default Chrome profile (recommended)
echo Option 1 - Using your normal Chrome profile:
echo "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
echo.

REM Option 2: Create a debug profile in your user directory
echo Option 2 - Using a debug profile:
echo "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%USERPROFILE%\chrome-debug"
echo.

REM Option 3: Minimal - let Chrome decide
echo Option 3 - Let Chrome handle it:
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222

pause