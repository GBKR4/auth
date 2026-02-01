@echo off
echo ================================================
echo   STARTING AUTHENTICATION SERVER (PERSISTENT)
echo ================================================
echo.
cd /d "%~dp0"
echo Current directory: %CD%
echo.
echo Starting server on port 5000...
echo Press Ctrl+C to stop the server
echo.
npm run dev
pause
