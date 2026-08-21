@echo off
echo ===================================================================
echo   Starting RajMines VTS (Vehicle Tracking System) POC
echo   Department of Mines ^& Geology, Govt. of Rajasthan
echo ===================================================================

echo [1/2] Starting Golang Backend Server...
start cmd /k "cd /d %~dp0backend && go run ./cmd/server/main.go"

timeout /t 2 /nobreak >nul

echo [2/2] Starting React Frontend...
start cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo Application launched!
echo Frontend: http://localhost:3000
echo Backend: http://localhost:8080
