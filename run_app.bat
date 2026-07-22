@echo off
title AAC Communication App (Single Unified Server)
echo ========================================================
echo   AAC Communication App - Unified Program Setup
echo ========================================================
echo.

cd /d "%~dp0"

echo Building frontend static assets...
cd frontend
call npm run build
cd ..

echo.
echo Starting unified server at http://localhost:5001/ ...
start http://localhost:5001/

echo Server running... Press Ctrl+C in the command window to stop.
py -3 app.py
pause
