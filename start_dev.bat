@echo off
title Launching AAC Communication App...
echo ========================================================
echo   Launching AAC Communication App (Frontend + Backend)
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Frontend Dependencies...
if not exist "frontend\node_modules" (
    echo Installing frontend npm packages...
    cd frontend
    call npm install
    cd ..
)

echo.
echo [2/3] Starting Backend Server (Flask :5001)...
start "AAC Backend (Flask :5001)" cmd /k "py -3 app.py"

echo.
echo [3/3] Starting Frontend Server (Vite :5173)...
start "AAC Frontend (Vite :5173)" cmd /k "cd frontend && npm run dev"

echo.
echo Waiting for servers to initialize...
timeout /t 3 /nobreak >nul

echo Opening browser at http://localhost:5173/ ...
start http://localhost:5173/

echo.
echo ========================================================
echo   App successfully launched!
echo   - Backend API: http://localhost:5001/api/health
echo   - Frontend App: http://localhost:5173/
echo ========================================================
