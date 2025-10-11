@echo off
REM TTS Web Application Launcher for Windows
REM Double-click this file to start the application

echo.
echo ========================================
echo    TTS Web Application Launcher
echo ========================================
echo.
echo Starting Docker Compose...
echo.

cd /d "%~dp0"
docker compose up --build

echo.
echo Application stopped.
pause
